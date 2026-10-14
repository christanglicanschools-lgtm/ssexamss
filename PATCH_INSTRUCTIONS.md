# Configuration diagnostic patch

Copy the three supplied code files over the matching paths in your existing project. Keep the other public files and assets. The approved messages, Principal attribution, technical team and contact details are unchanged.

1. Replace netlify/functions/api.cjs, public/index.html and public/sw.js in GitHub; commit and redeploy.
2. Open https://ssexams.cacgwa.com.ng/.netlify/functions/api in your browser. The response names missing environment variables without disclosing their values.
3. In the Netlify project serving that domain, set APPS_SCRIPT_URL, GATEWAY_SECRET and PASSWORD_PEPPER as environment variables with Production values and scope including Functions (or all scopes). Retain the original secrets. These values cannot be supplied to Functions by netlify.toml.
4. Redeploy again after saving variables. The diagnostic should show configured:true and missing:[]. This confirms visibility/non-blank values only; it does not certify that the Apps Script URL, signature or mail permissions are correct.
5. Reopen the portal and request the verification code. Save work and close all portal tabs/windows to activate the updated service worker.

The lazy-loading and beforeinstallprompt messages are informational. AdobeClean warnings originate from the Adobe browser extension. The HTML now includes mobile-web-app-capable while retaining the Apple compatibility tag.
