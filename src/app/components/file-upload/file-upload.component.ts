import { Component, input, output } from '@angular/core';
import { FileUploadVm } from '../../models/view-models';
import { formatDuration } from '../../utils/format-duration';

@Component({
  selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss',
})
export class FileUploadComponent {
  readonly vm = input.required<FileUploadVm>();
  readonly fileSelected = output<File>();

  protected isDragOver = false;
  protected readonly formatDuration = formatDuration;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(): void {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) this.fileSelected.emit(file);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.fileSelected.emit(file);
    input.value = '';
  }
}
