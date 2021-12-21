const sign = `
𝕸𝖚𝖋𝖋𝖎𝖓𝕶𝖎𝖓𝖌

`


const host_url = new URL(window.location.href);

if (host_url.origin == 'localhost') {
    var url = 'http://localhost:5001/lw-status/us-central1/status';
} else {
    var url = 'https://status.logicworld.ru/api';
}
function build_console() {
    
    if (url === 'https://status.logicworld.ru/api') {
        console.clear();
        console.log("%cLOADED PROD MODE", "color:green; font-family:sans-serif; font-size: 30px;")

    } else {
        console.log("%cLOADED DEV MODE", "color:red; font-family:sans-serif; font-size: 30px;")
    }
    console.log(`%cApi url is: \n ${url}`, "color:red; font-family:sans-serif; font-size: 30px; font-size: 20px");
    console.log(`%c\nThis service is build by:`, 'color:#fff; font-size:15px;');
    console.log(`%c${sign}`,"font-size:45px;color:crimson;", )
}

function pinging(hosts) {
    for (let i = 0; i < hosts.length; i++) {
        ping(hosts[i].host + ":" + hosts[i].port).then(function (delta) {
            document.getElementsByClassName("ping-num")[i].innerHTML = `${String(delta)}ms`;
        })
        .then(()=>{
            build_console();
        })
        .catch(function (err) {
            console.error(err);
        });
    }
}
async function refresh_status(state) {
    const container = document.getElementById('status-container');
    setTimeout(document.getElementById('status-container').style.opacity = 0, 10)
    setTimeout(document.getElementById('spiner_container').style.opacity = 1, 800)
    fetch(url, {
    })
        .then(response => response.json())
        .then(data => {
            console.log(data);


            var hosts = [];
            container.innerHTML = "";
            for (let i = 0; i < data.length; i++) {

                container.appendChild(document.createElement('div')).className = 'status';
                document.getElementsByClassName('status')[i].classList.add(data[i].avalible);
                document.getElementsByClassName('status')[i].appendChild(document.createElement('span')).className = 'status-icon';
                document.getElementsByClassName('status-icon')[i].appendChild(document.createElement('i')).className = data[i].icon;
                document.getElementsByClassName('status')[i].appendChild(document.createElement('span')).className = 'status-info';
                document.getElementsByClassName('status-info')[i].appendChild(document.createElement('div')).className = 'status-name';
                document.getElementsByClassName('status-info')[i].appendChild(document.createElement('div')).className = 'status-state';
                document.getElementsByClassName('status-info')[i].appendChild(document.createElement('div')).className = 'ping';
                document.getElementsByClassName('ping')[i].innerHTML = "Ping: ";
                document.getElementsByClassName('ping')[i].appendChild(document.createElement('span')).className = 'ping-num';
                document.getElementsByClassName('ping-num')[i].innerHTML = "<i class=\"fas fa-sync-alt fa-spin\"></i>";
                document.getElementsByClassName('status-name')[i].innerHTML = data[i].name;
                document.getElementsByClassName('status-state')[i].innerHTML = data[i].avalible;
                hosts.push({
                    host: data[i].host,
                    port: data[i].port
                });
            }
            console.log(hosts);
            pinging(hosts);
            setInterval(() => {
                pinging(hosts);
            }, 5000);
        })
        .then(() => {
            if (state === 'first_call') {
                document.getElementById('spiner_container').style.opacity = 0;
                setInterval(document.getElementById('status-container').style.opacity = 1, 400)
            } else {
                document.getElementById('spiner_container').style.opacity = 0;
                setInterval(document.getElementById('status-container').style.opacity = 1, 400)
            }

        })
        .catch(
            (err) => {
                container.innerHTML = "";
                container.appendChild(document.createElement('div')).id = 'error';
                document.getElementById('error').innerHTML = 'Something went wrong: <div id=error_text>' + err + '</div>';
                document.getElementById('spiner_container').style.opacity = 0;
                setInterval(document.getElementById('status-container').style.opacity = 1, 400)

            }
        );
}



refresh_status('first_call')



document.getElementById('reloadBtn').onclick = refresh_status;
console.error = () => { };