function refresh_css() {
    for (let i = 0; i < document.getElementsByClassName("css").length; i++) {
        let css_link = new URL(document.getElementsByClassName("css")[i].href);
        css_link.searchParams.set('refresh', new Date().getTime());
        document.getElementsByClassName("css")[i].href = css_link;
        console.log(`%cReloaded ${css_link.toString()}`, "color:green; font-size: 10px");
    }
}
function refresh_js() {
    for (let i = 0; i < document.getElementsByClassName("js").length; i++) {
        let js_link = new URL(document.getElementsByClassName("js")[i].src);
        js_link.searchParams.set('refresh', new Date().getTime());
        document.getElementsByClassName("js")[i].src = js_link;
        console.log(`%cReloaded ${js_link.toString()}`, "color:green; font-size: 10px");
    }
}