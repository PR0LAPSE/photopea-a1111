function reloadIframe() {
    const iframe = document.getElementById("webui-photopea-iframe");
    iframe.src = iframe.src;
}
setTimeout(() => {
        reloadIframe();
}, 10000);