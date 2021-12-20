const host_url = new URL(window.location.href);
if (host_url.origin = 'localhost') {
    var url = 'http://localhost:5001/lw-status/us-central1/status';
    console.log("%cLOADED DEV MODE", "color:red; font-family:serif; font-size: 30px")

} else {
    var url = 'https://status.logicworld.ru/api';
    console.log("%cLOADED PROD MODE", "color:green ")
}
console.log(`%cApi url is: \n ${url}`, "color:red; font-family:serif; font-size: 30px");
async function refresh_status(state) {
    const container = document.getElementById('status-container');
    setTimeout(document.getElementById('status-container').style.opacity = 0, 10)
    setTimeout(document.getElementById('spiner_container').style.opacity = 1, 800)
    fetch(url,{
        })
        .then(response => response.json())
        .then(data => {
            console.log(data);


            container.innerHTML = "";
            for (let i = 0; i < data.length; i++) {

                container.appendChild(document.createElement('div')).className = 'status';
                document.getElementsByClassName('status')[i].classList.add(data[i].avalible);
                document.getElementsByClassName('status')[i].appendChild(document.createElement('span')).className = 'status-icon';
                document.getElementsByClassName('status-icon')[i].appendChild(document.createElement('i')).className = data[i].icon;
                document.getElementsByClassName('status')[i].appendChild(document.createElement('span')).className = 'status-info';
                document.getElementsByClassName('status-info')[i].appendChild(document.createElement('div')).className = 'status-name';
                document.getElementsByClassName('status-info')[i].appendChild(document.createElement('div')).className = 'status-state';
                document.getElementsByClassName('status-name')[i].innerHTML = data[i].name;
                document.getElementsByClassName('status-state')[i].innerHTML = data[i].avalible;

            }
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