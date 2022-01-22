const sign = `
          _   _      
|\\/|    _|_ _|_ o ._  |/ o ._   _  
|  | |_| |   |  | | | |\\ | | | (_| 
                                _| 
`

function build_console() {
    if (debug.detectDev() == true) {
        console.warn("%cLOADED IN DEV MODE", "color:red; font-family:sans-serif; font-size: 30px;")
        console.log(`%cAPI url is: \n ${url}`, "color:red; font-family:sans-serif; font-size: 30px; font-size: 20px");
        console.log(`%c\nThis service is build by:`, 'color:#fff; font-size:15px;');
        console.warn(`%c${sign}`, "font-size:14px;color:crimson;",)
    }
    else {
        console.log("%cLOADED IN PROD MODE", "color:green; font-family:sans-serif; font-size: 30px;")

        console.log(`%c\nThis service is build by:`, 'color:#fff; font-size:15px;');
        console.warn(`%c${sign}`, "font-size:14px;color:crimson;",)
    }

}

async function refresh_status_i() {
    const container = document.getElementById('status-container-i');
    setTimeout(document.getElementById('status-container-i').style.opacity = 0, 10)
    setTimeout(document.getElementById('spiner_container-i').style.opacity = 1, 800)
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            container.innerHTML = "";
            var hosts = new Array(data.length);
            for (let i = 0; i < data.length; i++) {

                container.appendChild(document.createElement('div')).className = 'status-i';
                document.getElementsByClassName('status-i')[i].classList.add(data[i].avalible);
                document.getElementsByClassName('status-i')[i].appendChild(document.createElement('span')).className = 'status-icon-i';
                document.getElementsByClassName('status-icon-i')[i].appendChild(document.createElement('i')).className = data[i].icon;
                document.getElementsByClassName('status-i')[i].appendChild(document.createElement('span')).className = 'status-info-i';
                document.getElementsByClassName('status-info-i')[i].appendChild(document.createElement('div')).className = 'status-name-i';
                document.getElementsByClassName('status-info-i')[i].appendChild(document.createElement('div')).className = 'status-state-i';
                document.getElementsByClassName('status-name-i')[i].innerHTML = data[i].name;
                document.getElementsByClassName('status-state-i')[i].innerHTML = data[i].avalible;
                hosts[i] = {
                    host: data[i].host,
                    port: data[i].port
                };

            }
            console.log(hosts);
            return hosts;
        })
        .then(() => {
            document.getElementById('spiner_container-i').style.opacity = 0;
            setTimeout(document.getElementById('status-container-i').style.opacity = 1, 400)

        })
        .catch(
            (err) => {
                container.innerHTML = "";
                container.appendChild(document.createElement('div')).id = 'error-i';
                document.getElementById('error-i').innerHTML = 'Something went wrong: <div class=error_text>' + err + '</div>';
                document.getElementById('spiner_container-i').style.opacity = 0;
                setTimeout(document.getElementById('status-container-i').style.opacity = 1, 400)

            }
        );
}

async function qr_gen(content, bg, color, id) {
    var qrcode = new QRCode({
        padding: 0,
        background: bg,
        color: color,
        content: content,
        container: "svg-viewbox", //Responsive use
        join: true

    });
    document.getElementById(id).innerHTML = qrcode.svg();
    return 0;
}

const dummy_gs = "./assets/debug/gs-status-dummy.json"
const normal_gs = "https://logicworld.ru/monAJAX/cache/cache.json"

function refresh_status_g(recal) {
    setTimeout(document.getElementById('spiner_container-g').style.opacity = 1, 800)
    if (recal == true) {
        document.getElementById("status-summary-g").parentNode.removeChild(document.getElementById("status-summary-g"))
        document.getElementById("status-container-g").parentNode.removeChild(document.getElementById("status-container-g"))
    }
    fetch(`${normal_gs}?nocache=` + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            console.log(data);
            let time = new Date()
            document.getElementById("status-wrapper-g").appendChild(document.createElement("div")).id = "status-summary-g"
            document.getElementById("status-wrapper-g").appendChild(document.createElement("div")).id = "status-container-g"
            const container = document.getElementById('status-container-g');
            document.getElementById("status-container-g").classList = "status-container";
            container.innerHTML = "";
            document.getElementById("status-summary-g").innerHTML = ""
            setTimeout(document.getElementById('status-container-g').style.opacity = 0, 10)
            setTimeout(document.getElementById('status-summary-g').style.opacity = 0, 10)

            for (let i = 0; i <= 1; i++) {
                document.getElementById("status-summary-g").appendChild(document.createElement("div")).className = "summary-container";
            }
            const summ_cont = document.getElementsByClassName("summary-container");
            summ_cont[0].appendChild(document.createElement("a")).id = "qr"
            summ_cont[1].appendChild(document.createElement("div")).id = "summary-status-container-g"
            summ_cont[1].style = "width:100%;";
            document.getElementById("summary-status-container-g").appendChild(document.createElement("table")).id = "summary-status-g";

            for (let i = 0; i < 3; i++) {
                document.getElementById("summary-status-g").appendChild(document.createElement("tr")).className = "summary-status-tr-g";
                for (let j = 0; j < 4; j++) {
                    document.getElementsByClassName("summary-status-tr-g")[i].appendChild(document.createElement("td")).className = "summary-status-td-g";
                }
            }
            const summ_td = document.getElementsByClassName("summary-status-td-g");
            summ_td[0].innerHTML = "Игроков в сети:";
            summ_td[1].innerHTML = data.online + "/" + data.slots;
            summ_td[2].innerHTML = `${time.toLocaleTimeString("ru-RU")}`;
            summ_td[3].innerHTML = "<i class=\"fas fa-user-friends\"></i>";
            summ_td[4].innerHTML = "Рекорд за сегодня:";
            summ_td[5].innerHTML = data.recordday;
            summ_td[6].innerHTML = data.timerecday;
            summ_td[7].innerHTML = "<i class=\"fas fa-trophy\"></i>";
            summ_td[8].innerHTML = "Рекорд за всё время:";
            summ_td[9].innerHTML = data.record;
            summ_td[10].innerHTML = data.timerec;
            summ_td[11].innerHTML = "<i class=\"fas fa-trophy\"></i>";
            document.getElementById("summary-status-container-g").appendChild(document.createElement("div")).id = "summary-status-progressbar-g";
            document.getElementById("summary-status-progressbar-g").appendChild(document.createElement("div")).id = "summary-progressbar-pad-g";
            document.getElementById("summary-progressbar-pad-g").appendChild(document.createElement("div")).id = "progressbar-g";
            document.getElementById("progressbar-g").style = `width: ${100 - data.percent}%;`


            qr_gen("https://logicworld.ru/", "none", "var(--text-secondary)", "qr");
            document.getElementById("qr").href = "https://logicworld.ru/"


            let stat_index = 0;
            Object.entries(data.servers).forEach(([key, value]) => {
                container.appendChild(document.createElement('div')).className = 'status-g';
                document.getElementsByClassName("status-g")[stat_index].appendChild(document.createElement("a")).className = "status-icon-g";
                document.getElementsByClassName("status-g")[stat_index].appendChild(document.createElement("div")).className = "status-info-g";
                document.getElementsByClassName("status-icon-g")[stat_index].classList.add("status-icon-g-qr");
                document.getElementsByClassName("status-icon-g")[stat_index].id = `${key}-icon`;
                document.getElementsByClassName("status-icon-g")[stat_index].href = `https://logicworld.ru/description.html#${key}`;
                qr_gen(`https://logicworld.ru/description.html#${key}`, "none", "var(--text-secondary)", `${key}-icon`);

                document.getElementsByClassName("status-info-g")[stat_index].appendChild(document.createElement("div")).className = "status-info-name-g";
                document.getElementsByClassName("status-info-name-g")[stat_index].appendChild(document.createElement("span")).className = "status-info-server-name-g";
                document.getElementsByClassName("status-info-server-name-g")[stat_index].innerHTML = key;
                document.getElementsByClassName("status-info-name-g")[stat_index].appendChild(document.createElement("span")).className = "status-info-server-status-g";
                document.getElementsByClassName("status-info-server-status-g")[stat_index].innerHTML = data.servers[key].status;


                document.getElementsByClassName("status-info-g")[stat_index].appendChild(document.createElement("div")).className = "status-info-online-g";

                document.getElementsByClassName("status-info-g")[stat_index].appendChild(document.createElement("div")).className = "status-info-progressbar-g";
                document.getElementsByClassName("status-info-progressbar-g")[stat_index].appendChild(document.createElement("div")).className = "status-info-progressbar-pad-g";

                if (data.servers[key].status == "online" && data.servers[key].motd) {
                    console.log(data.servers[key]);
                    document.getElementsByClassName('status-g')[stat_index].classList.add("Online");
                    document.getElementsByClassName("status-info-online-g")[stat_index].appendChild(document.createElement("span")).id = `status-info-online-text-${key}-g`;
                    document.getElementsByClassName("status-info-online-g")[stat_index].appendChild(document.createElement("span")).id = `status-info-online-players-${key}-g`;

                    document.getElementsByClassName("status-info-progressbar-pad-g")[stat_index].appendChild(document.createElement("div")).id = `status-info-progressbar-bar-${key}-g`;

                    document.getElementById(`status-info-progressbar-bar-${key}-g`).style = `width: ${100 - data.servers[key].percent}%;`
                    document.getElementById(`status-info-progressbar-bar-${key}-g`).className = `status-info-progressbar-bar-g`;

                    document.getElementById(`status-info-online-text-${key}-g`).textContent = "В сети:";
                    document.getElementById(`status-info-online-players-${key}-g`).textContent = `${data.servers[key].online}/${data.servers[key].slots}`
                } else {
                    document.getElementsByClassName('status-g')[stat_index].classList.add("Offline");
                    document.getElementsByClassName("status-info-online-g")[stat_index].innerHTML = "<span style=\"margin: auto;\">НЕДОСТУПЕН</span>"

                }

                stat_index++;
            });
        })
        .then(() => {
            document.getElementById('spiner_container-g').style.opacity = 0;
            setTimeout(document.getElementById('status-container-g').style.opacity = 1, 400)
            setTimeout(document.getElementById('status-summary-g').style.opacity = 1, 400)

        })
    // .catch(
    //     (err) => {
    //         console.error(err);
    //         container.innerHTML = "";
    //         container.appendChild(document.createElement('div')).id = 'error-g';
    //         document.getElementById('error-g').innerHTML = 'Something went wrong: <div class=error_text>' + err + '</div>';
    //         document.getElementById('spiner_container-g').style.opacity = 0;
    //         setTimeout(document.getElementById('status-container-g').style.opacity = 1, 400)

    //     }
    // );

}

debug.detectDev(); //detecting localhost

refresh_status_i(); //loading status of infrastructure 
refresh_status_g(false); //loading game servers status

;

build_console(); //drawwing console