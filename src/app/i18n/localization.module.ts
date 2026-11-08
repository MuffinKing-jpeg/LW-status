import {NgModule} from '@angular/core';
import {LocalDatePipe, LocalNumberPipe, TranslationPipe} from './localization.service';

@NgModule({declarations: [TranslationPipe, LocalDatePipe, LocalNumberPipe], exports: [TranslationPipe, LocalDatePipe, LocalNumberPipe]})
export class LocalizationModule {}
