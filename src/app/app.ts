import { Component, inject } from '@angular/core';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { PlayerComponent } from './components/player/player.component';
import { IosInstallHintComponent } from './components/ios-install-hint/ios-install-hint.component';
import { AudioService } from './services/audio.service';

@Component({
  selector: 'app-root',
  imports: [FileUploadComponent, PlayerComponent, IosInstallHintComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly audio = inject(AudioService);
}
