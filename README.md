# CACG SSEXAMS — clean deployment project

Preserves the supplied off-chat edits exactly: Principal attribution, technical-team credit, Principal contact, resource links and landscape CSS. Timestamped upload filenames are normalised to the names referenced by HTML, the manifest and service worker. The two supplied app copies were identical; only one app.js is included.

Extract this ZIP. Upload its CONTENTS into the root of christanglicanschools-lgtm/ssexams, preserving public/ and netlify/ directories. Do not upload only the ZIP and do not place the project inside an extra wrapper directory.

Netlify settings are supplied in netlify.toml: base '.', command 'npm run check', publish 'public', functions 'netlify/functions'. Retain APPS_SCRIPT_URL, GATEWAY_SECRET and PASSWORD_PEPPER as Netlify runtime environment variables.

Private Google Apps Script setup remains in the previously supplied DONT_PUSH bundle; it is not part of the public repository. The server function is included here. Deployments require that private Apps Script backend to be configured separately.

The new service-worker cache version is cacg-shell-v4-user-edits-20261013. Save current work, close all portal tabs/app windows, then reopen after deployment to activate the latest cached version.
