const snowMap = {
  snowy: "clear",
  clear: "snowy",
};


var month = (new Date().getMonth());

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

function checkSnowDate() {
  if ([0, 1, 2, 10, 11].indexOf(month) < 0) {
    document.getElementById('snowButton').style.display = 'none';
    bodyClassSnow.replace(localStorage.getItem('snow'), 'clear');
  }
}
checkSnowDate();
