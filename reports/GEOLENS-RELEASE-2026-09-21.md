# Geolens production release — 2026-09-21

用户明确要求“上线”。已将本轮改版的生产构建发布至既有 Vercel 项目，未提交或推送 Git，未修改原 Grok 站点。

## Release

- Public URL: https://terralens-kohl.vercel.app/
- Project: `terralens` / `prj_3aBkXA6i4TCC5zXd57KyHMrZONX9`
- Team: `team_0wdfnN4aaPMS575meG8bVRSY`
- Deployment: `dpl_BiM7KEWhjunVCgznejmNtWwUKed1`
- Immutable URL: https://terralens-il3cxso85-harryxin0919s-projects.vercel.app
- Command: `vercel deploy --prebuilt --prod --yes`
- Vercel API confirmed `READY`, target `production`, both existing aliases assigned, no alias error.
- Aliases: `terralens-kohl.vercel.app`, `terralens-harryxin0919s-projects.vercel.app`.
- Uploaded build: Nitro output generated at `2026-09-21T04:48:08.422Z`, after the final source edit at `04:45:01Z`.
- This was a prebuilt working-tree release; the inherited Git commit metadata does not represent all deployed changes.

## Verification

- Local type check, production build and 108 targeted tests passed before release; 62/62 local lab entries reached ready state.
- Independent output preflight found all 1,646 public resources present with matching sizes, no zero-byte output files, no missing scanned JS/CSS relative imports, and all 245 final question explanations in the output.
- Vercel remote HTTP checks returned 200 for `/`, `/explore`, `/lab/eclipses`, `/teachers/climate-types`, `/image-credits`, `/manifest.webmanifest`, and `/assets/styles-DD-GvlL7.css`.
- The production homepage names Geolens, uses English, and references the final versioned JS/CSS bundles.
- Production CSS ETag `91e744769fbf03955f3e156daacecb9a` matches the local output MD5. Manifest ETag `fff4743a5ff62972fe7a8644be309c69` also matches local output.
- Public-browser homepage verification: rendered Earth canvas, 21 loaded images, no horizontal overflow, no captured console errors.
- Public-browser `/lab/eclipses`: reached `data-lab-entry="ready"`; lunar shadow close-up and controls rendered. Selecting the orbital-tilt answer produced “That’s right.” and the final explanation of orbital tilt and nodes. No captured console errors.
- Initial local browser/network connections failed transiently; a later fresh browser visit succeeded. No network settings or security protections were changed.
- Production verification covers the above representative flow, not every parameter combination in all 62 labs. Existing media-source and school-network playback follow-ups remain documented in `geolens-media-review.md`.

## Rollback reference

The live alias was inspected immediately before release; its previous deployment was:

- `dpl_BmsiQA3Myy2WzEgA5RAmLgzWe7qg`
- https://terralens-qh16th6pt-harryxin0919s-projects.vercel.app

If rollback is requested, from `D:\Claude\terralens-work` use:

```powershell
vercel rollback https://terralens-qh16th6pt-harryxin0919s-projects.vercel.app
```

Then recheck the public alias and the returned deployment ID. Rollback has not been executed.
