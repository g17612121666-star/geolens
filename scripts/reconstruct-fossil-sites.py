"""Reconstruct representative fossil localities with the same plate model as the coastline snapshots.

Usage: python3 scripts/reconstruct-fossil-sites.py <Muller_etal_2019_PlateMotionModel_v2.0_Tectonics dir>

The model files (rotations and static polygons, Müller et al. 2019, CC BY 3.0) are published by
EarthByte and mirrored in https://github.com/GPlates/pygplates-tutorials (data/). Requires
`pip install pygplates`. Writes src/labs/continental-drift/fossil-sites.json.
"""

import json
import pathlib
import sys

import pygplates

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "src/labs/continental-drift/fossil-sites.json"
model = pathlib.Path(sys.argv[1])
rotations = pygplates.RotationModel(
    [str(p) for p in sorted(model.glob("Global_*_Rotations_2019_v2.rot"))]
)
static = pygplates.FeatureCollection(
    str(
        model
        / "StaticGeometries/StaticPolygons/Global_EarthByte_GPlates_PresentDay_StaticPlatePolygons_2019_v1.shp"
    )
)

# Representative published localities (present-day lat, lon), rounded to 0.1°.
TAXA = {
    "mesosaurus": {
        "name": "Mesosaurus",
        "kind": "Freshwater reptile · Early Permian",
        "sites": [
            ("Irati Formation, Paraná, Brazil", -25.9, -50.4),
            ("Mangrullo Formation, Uruguay", -32.4, -54.2),
            ("Whitehill Formation, Namibia", -26.6, 18.1),
            ("Whitehill Formation, South Africa", -32.6, 20.6),
        ],
    },
    "glossopteris": {
        "name": "Glossopteris",
        "kind": "Seed fern · Permian",
        "sites": [
            ("Rio Bonito Formation, Brazil", -28.8, -49.4),
            ("Vereeniging coalfield, South Africa", -26.7, 27.9),
            ("Raniganj coalfield, India", 23.6, 87.1),
            ("Sydney Basin, Australia", -32.9, 151.7),
            ("Beardmore Glacier area, Antarctica", -84.7, 165.0),
        ],
    },
    "lystrosaurus": {
        "name": "Lystrosaurus",
        "kind": "Land reptile · Early Triassic",
        "sites": [
            ("Katberg Formation, South Africa", -32.2, 26.6),
            ("Panchet Formation, India", 23.6, 86.8),
            ("Fremouw Formation, Antarctica", -84.2, 162.4),
        ],
    },
    "cynognathus": {
        "name": "Cynognathus",
        "kind": "Land reptile · Early–Middle Triassic",
        "sites": [
            ("Burgersdorp Formation, South Africa", -31.0, 26.3),
            ("Puesto Viejo Group, Argentina", -34.8, -68.5),
        ],
    },
}

AGES = list(range(0, 251, 10))
out = {
    "model": "MULLER2019",
    "credit": "Plate model: Müller et al. (2019), EarthByte, CC BY 3.0. Localities: representative published fossil sites.",
    "method": "Present-day localities assigned to plates with the 2019 static polygons, then rotated with pygplates at each 10 Ma snapshot (anchor plate 0), matching the coastline textures.",
    "ages": AGES,
    "taxa": [],
}
for key, taxon in TAXA.items():
    features = []
    for label, lat, lon in taxon["sites"]:
        f = pygplates.Feature()
        f.set_geometry(pygplates.PointOnSphere(lat, lon))
        f.set_name(label)
        features.append(f)
    assigned = pygplates.partition_into_plates(
        static,
        rotations,
        features,
        properties_to_copy=[
            pygplates.PartitionProperty.reconstruction_plate_id,
            pygplates.PartitionProperty.valid_time_period,
        ],
    )
    sites = []
    for f in assigned:
        plate = f.get_reconstruction_plate_id()
        positions = []
        for age in AGES:
            rotation = rotations.get_rotation(age, plate, anchor_plate_id=0)
            lat, lon = (rotation * f.get_geometry()).to_lat_lon()
            positions.append([round(lat, 2), round(lon, 2)])
        sites.append({"label": f.get_name(), "plate": plate, "positions": positions})
    out["taxa"].append({"key": key, "name": taxon["name"], "kind": taxon["kind"], "sites": sites})

OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print("wrote", OUT, sum(len(t["sites"]) for t in out["taxa"]), "sites")
for t in out["taxa"]:
    for s in t["sites"]:
        print(t["name"], s["label"], "plate", s["plate"], "0Ma", s["positions"][0], "250Ma", s["positions"][-1])
