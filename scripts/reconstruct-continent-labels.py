"""Reconstruct one label anchor per major continent with the same plate model as the coastlines.

Usage: python3 scripts/reconstruct-continent-labels.py <Muller_etal_2019_PlateMotionModel_v2.0_Tectonics dir>

Uses the same model files as scripts/reconstruct-fossil-sites.py (Müller et al. 2019, CC BY 3.0,
mirrored in https://github.com/GPlates/pygplates-tutorials, data/). Requires
`pip install pygplates`. Writes src/labs/continental-drift/continent-labels.json.
"""

import json
import pathlib
import sys

import pygplates

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "src/labs/continental-drift/continent-labels.json"
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

# Present-day anchors well inside each continent's stable interior (lat, lon), so each one sits
# on the plate that carries most of the continent.
CONTINENTS = [
    ("North America", "N. America", 42.0, -100.0),
    ("South America", "S. America", -10.0, -55.0),
    ("Africa", "Africa", 5.0, 22.0),
    ("Eurasia", "Eurasia", 55.0, 70.0),
    ("India", "India", 22.0, 78.0),
    ("Australia", "Australia", -25.0, 133.0),
    ("Antarctica", "Antarctica", -80.0, 20.0),
]

AGES = list(range(0, 251, 10))
features = []
for name, _short, lat, lon in CONTINENTS:
    f = pygplates.Feature()
    f.set_geometry(pygplates.PointOnSphere(lat, lon))
    f.set_name(name)
    features.append(f)
assigned = pygplates.partition_into_plates(
    static,
    rotations,
    features,
    properties_to_copy=[pygplates.PartitionProperty.reconstruction_plate_id],
)
short = {name: s for name, s, _lat, _lon in CONTINENTS}
continents = []
for f in assigned:
    plate = f.get_reconstruction_plate_id()
    positions = []
    for age in AGES:
        rotation = rotations.get_rotation(age, plate, anchor_plate_id=0)
        lat, lon = (rotation * f.get_geometry()).to_lat_lon()
        positions.append([round(lat, 2), round(lon, 2)])
    continents.append(
        {"name": f.get_name(), "short": short[f.get_name()], "plate": plate, "positions": positions}
    )

out = {
    "model": "MULLER2019",
    "credit": "Plate model: Müller et al. (2019), EarthByte, CC BY 3.0.",
    "method": "One present-day anchor per continent, assigned to a plate with the 2019 static polygons and rotated with pygplates at each 10 Ma snapshot (anchor plate 0), matching the coastline textures.",
    "ages": AGES,
    "continents": continents,
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print("wrote", OUT)
for c in continents:
    print(c["name"], "plate", c["plate"], "0Ma", c["positions"][0], "250Ma", c["positions"][-1])
