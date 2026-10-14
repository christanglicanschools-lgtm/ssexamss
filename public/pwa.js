'use strict';
let installPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;document.dispatchEvent(new Event('cacg-install'));});
window.addEventListener('appinstalled',()=>{installPrompt=null;document.dispatchEvent(new Event('cacg-install'));});
window.CACGInstall=async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else{const dialog=document.querySelector('#install-dialog');if(dialog)dialog.showModal();}};
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('/sw.js').catch(()=>{});
