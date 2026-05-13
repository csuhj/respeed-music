import { Component, computed, inject } from '@angular/core';
import { FileUploadComponent } from './components/file-upload/file-upload.component';
import { PlayerComponent } from './components/player/player.component';
import { IosInstallHintComponent } from './components/ios-install-hint/ios-install-hint.component';
import { AudioStateService } from './services/audio-state.service';
import { AudioEngineService } from './services/audio-engine.service';
import { FileUploadVm } from './models/view-models';

@Component({
  selector: 'app-root',
  imports: [FileUploadComponent, PlayerComponent, IosInstallHintComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly state = inject(AudioStateService);
  private readonly engine = inject(AudioEngineService);

  protected readonly fileUploadVm = computed<FileUploadVm>(() => ({
    isLoaded: this.state.isLoaded(),
    fileName: this.state.fileName(),
    duration: this.state.duration(),
    error:    this.state.error(),
  }));

  onFileSelected(file: File): void {
    this.engine.load(file);
  }
}
