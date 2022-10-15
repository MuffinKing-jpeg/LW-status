import {enableProdMode} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';

import {AppModule} from './app/app.module';
import {environment} from './environments/environment';

const sign = `
          _   _
|\\/|    _|_ _|_ o ._  |/ o ._   _
|  | |_| |   |  | | | |\\ | | | (_|
                                _|
`
const startApp = () => {
  setTimeout(() => {
    platformBrowserDynamic().bootstrapModule(AppModule)
      .catch(err => console.error(err));
  }, 500)
}
if (environment.production) {
  enableProdMode();
}

console.log(`%cThis app is build by %c${sign}\n%cCheck my GitHub https://github.com/MuffinKing-jpeg`, 'color: #fff; font-size: 18px; font-family: Rubik, sans-serif', 'color: #dc143c', 'color: crimson; font-family: Rubik, sans-serif; font-size: 18px;')
startApp();


