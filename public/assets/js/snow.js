const snowMap = {
  snowy: "clear",
  clear: "snowy",
};



const snow = localStorage.getItem('snow')
  || (tmp = Object.keys(snowMap)[0],
    localStorage.setItem('snow', tmp),
    tmp);
const bodyClassSnow = document.body.classList;
bodyClassSnow.add(snow);

function toggleSnow() {
  const currentSnow = localStorage.getItem('snow');
  const nextSnow = snowMap[currentSnow];
  bodyClassSnow.replace(currentSnow, nextSnow);
  localStorage.setItem('snow', nextSnow);
}

document.getElementById('snowButton').onclick = toggleSnow;

const month = (new Date().getMonth());
if (![0, 1, 11].indexOf(month)) {
  document.getElementById('snowButton').style.display = 'none';
  bodyClassSnow.replace(localStorage.getItem('snow'), 'clear');
}

