const themeMap = {
  dark: "light",
  light: "dark",
};
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
  localStorage.setItem('theme', "light")
}
const theme = localStorage.getItem('theme')
  || (tmp = Object.keys(themeMap)[0],
      localStorage.setItem('theme', tmp),
      tmp);
const bodyClassTheme = document.body.classList;
bodyClassTheme.add(theme);

function toggleTheme() {
  const currentTheme = localStorage.getItem('theme');
  const nextTheme = themeMap[currentTheme];

  bodyClassTheme.replace(currentTheme, nextTheme);
  localStorage.setItem('theme', nextTheme);
}

document.getElementById('themeButton').onclick = toggleTheme;
