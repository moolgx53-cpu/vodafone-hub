# Mandatory Auto-Versioning & Auto-Deploy Rule

Whenever any modification, addition, or bug fix is made to the Vodafone Hub project:
1. Apply the requested changes in the code.
2. Increment the version number (e.g. `v1.0.1` -> `v1.0.2`):
   - In `version.json`: Update `"version"`, `"updatedAt"`, and write an Arabic summary in `"changelog"`.
   - In `sw.js`: Update `CACHE_VERSION`.
   - In `index.html`: Update `CURRENT_APP_VERSION` and `#txt-version-number`.
3. Commit and push to GitHub (`git add .`, `git commit -m "..."`, `git push origin main`) to ensure GitHub Pages and all devices across the world receive the update instantly.
