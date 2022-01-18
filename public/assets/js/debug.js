let dev = {
    refresh_css: () => {
        for (let i = 0; i < document.getElementsByClassName("css").length; i++) {
            let css_link = new URL(document.getElementsByClassName("css")[i].href);
            css_link.searchParams.set('refresh', new Date().getTime());
            document.getElementsByClassName("css")[i].href = css_link;
            console.log(`%cReloaded ${css_link.toString()}`, "color:green; font-size: 10px");

        } return "CSS reloaded"
    },
    toggleDev: (state) => {
        if (state == true) {
            console.log(`%c\nDebug enabled`, 'color:red; font-size:15px;');
            document.body.classList.add("debug")
            return "Debug enabled";
        } else {
            console.log(`%c\nDebug disabled`, 'color:red; font-size:15px;');
            document.body.classList.remove("debug")
            return "Debug disabled";
        }
    }
}