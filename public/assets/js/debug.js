let url;
const host_url = new URL(window.location.href);
const debug = {
    refresh_css() {
        for (let i = 0; i < document.getElementsByClassName("css").length; i++) {
            let css_link = new URL(document.getElementsByClassName("css")[i].href);
            css_link.searchParams.set('refresh', new Date().getTime());
            document.getElementsByClassName("css")[i].href = css_link;
            console.log(`%cReloaded ${css_link.toString()}`, "color:green; font-size: 10px");

        } return "CSS reloaded"
    },
    toggleDev(state) {
        if (state == true) {
            document.body.classList.add("debug")
            return "Debug enabled";
        } else {
            console.log(`%c\nDebug disabled`, 'color:red; font-size:15px;');
            document.body.classList.remove("debug")
            return "Debug disabled";
        }
    },
    detectDev() {
        if (host_url.hostname == 'localhost') {
            this.toggleDev(true);
            url = 'http://localhost:5001/lw-status/us-central1/status';
            return true;
        } else {
            url = 'https://status.logicworld.ru/api';
            return false;
        }
    },
    link: {
        broken: "http://some.broken:1337/stuff?v=69",
        oldURL: undefined
    },
    breakLink() {
        if (this.link.oldURL != this.link.broken && this.link.oldURL != url) {
            oldURL = this.link.broken;
            url = this.link.broken;
            console.log(`%c\nLink successfully hacked`, 'color:red; font-size:15px;');
            return true;
        } else {
            console.log(`%c\nLink is unhackable ¯\\_(ツ)_/¯`, 'color:red; font-size:15px;');
            return false;
        }
    },
    fixLink() {
        this.detectDev();
            console.log(`%c\nLink FIXED ¯\\_(ツ)_/¯`, 'color:green; font-size:15px;');
        
    }


}