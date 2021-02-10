const url = 'https://status.logicworld.ru/api'

async function refresh_status() {
    const container = document.getElementById('status-container');
            container.innerHTML = '';
            setTimeout(document.getElementById('status-container').style.opacity = 0,10)
    fetch(url)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            
            
            
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
        }).then(()=>setTimeout(document.getElementById('status-container').style.opacity = 1,10))
        .catch();
}

refresh_status();



document.getElementById('reloadBtn').onclick = refresh_status;