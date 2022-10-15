import { Component, OnInit } from '@angular/core';
import {ThemeService} from "../../services/theme.service";

@Component({
  selector: 'app-theme-btn',
  templateUrl: './theme-btn.component.html',
  styleUrls: ['./theme-btn.component.scss']
})
export class ThemeBtnComponent implements OnInit {

  constructor(
    public themeService: ThemeService
  ) { }

  ngOnInit(): void {
  }

}
