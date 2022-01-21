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

async function refresh_status_g() {
    const container = document.getElementById('status-container-g');
    setTimeout(document.getElementById('status-container-g').style.opacity = 0, 10)
    setTimeout(document.getElementById('spiner_container-g').style.opacity = 1, 800)
    fetch("https://logicworld.ru/monAJAX/cache/cache.json")
        .then(response => response.json())
        .then(data => {
            console.log(data);
            container.innerHTML = "";
        })
        .catch(
            (err) => {
                container.innerHTML = "";
                container.appendChild(document.createElement('div')).id = 'error-g';
                document.getElementById('error-g').innerHTML = 'Something went wrong: <div class=error_text>' + err + '</div>';
                document.getElementById('spiner_container-g').style.opacity = 0;
                setTimeout(document.getElementById('status-container-g').style.opacity = 1, 400)

            }
        );

}

debug.detectDev(); //detecting localhost

refresh_status_i(); //loading status of infrastructure 
refresh_status_g(); //loading game servers status

document.getElementById('reloadBtn-i').onclick = refresh_status_i;  //binding functions to refresh buttons 
document.getElementById('reloadBtn-g').onclick = refresh_status_g;

build_console(); //drawwing console