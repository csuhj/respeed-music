import { Component, inject } from '@angular/core';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { PlayerComponent } from './components/player/player.component';
import { AudioService } from './services/audio.service';

@Component({
  selector: 'app-root',
  imports: [FileUploadComponent, PlayerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly audio = inject(AudioService);
}
