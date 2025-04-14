import { Component } from '@angular/core';

@Component({
  selector: 'app-tools',
  templateUrl: './tools.component.html',
  styleUrls: ['./tools.component.scss']
})
export class ToolsComponent {
  activeTab: string = 'rpgle'; // Default active tab

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
}