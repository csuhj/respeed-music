import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { FileUploadComponent } from './file-upload.component';
import { FileUploadVm } from '../../models/view-models';

const EMPTY_VM: FileUploadVm = { isLoaded: false, fileName: '', duration: 0, error: null };
const LOADED_VM: FileUploadVm = { isLoaded: true, fileName: 'song.mp3', duration: 185, error: null };

describe('FileUploadComponent', () => {
  let fixture: ComponentFixture<FileUploadComponent>;
  let component: FileUploadComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileUploadComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FileUploadComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vm', EMPTY_VM);
    fixture.detectChanges();
  });

  it('creates successfully', () => {
    expect(component).toBeTruthy();
  });

  describe('unloaded state', () => {
    it('shows the drop prompt', () => {
      expect(fixture.nativeElement.querySelector('.prompt')).toBeTruthy();
    });

    it('does not show the loaded info panel', () => {
      expect(fixture.nativeElement.querySelector('.loaded-info')).toBeFalsy();
    });

    it('does not show an error message when error is null', () => {
      expect(fixture.nativeElement.querySelector('.error-message')).toBeFalsy();
    });
  });

  describe('loaded state', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('vm', LOADED_VM);
      fixture.detectChanges();
    });

    it('hides the drop prompt', () => {
      expect(fixture.nativeElement.querySelector('.prompt')).toBeFalsy();
    });

    it('shows the file name', () => {
      const el = fixture.nativeElement.querySelector('.file-name') as HTMLElement;
      expect(el.textContent?.trim()).toBe('song.mp3');
    });

    it('shows formatted duration', () => {
      const el = fixture.nativeElement.querySelector('.file-duration') as HTMLElement;
      expect(el.textContent?.trim()).toBe('3:05');
    });

    it('applies .loaded class to upload zone', () => {
      const zone = fixture.nativeElement.querySelector('.upload-zone') as HTMLElement;
      expect(zone.classList.contains('loaded')).toBe(true);
    });
  });

  describe('error state', () => {
    it('shows error message when vm.error is set', () => {
      fixture.componentRef.setInput('vm', { ...EMPTY_VM, error: 'Unsupported format' });
      fixture.detectChanges();
      const el = fixture.nativeElement.querySelector('.error-message') as HTMLElement;
      expect(el.textContent?.trim()).toBe('Unsupported format');
    });
  });

  describe('file selection', () => {
    it('emits fileSelected when a file is dropped', () => {
      const emitted: File[] = [];
      component.fileSelected.subscribe(f => emitted.push(f));

      const mockFile = new File(['audio'], 'dropped.mp3', { type: 'audio/mpeg' });
      // Call the handler directly — jsdom's DragEvent does not support dataTransfer.files
      component.onDrop({
        preventDefault: vi.fn(),
        dataTransfer: { files: [mockFile] },
      } as unknown as DragEvent);

      expect(emitted.length).toBe(1);
      expect(emitted[0].name).toBe('dropped.mp3');
    });

    it('emits fileSelected when a file is chosen via input', () => {
      const emitted: File[] = [];
      component.fileSelected.subscribe(f => emitted.push(f));

      const mockFile = new File(['audio'], 'chosen.mp3', { type: 'audio/mpeg' });
      const input = fixture.nativeElement.querySelector('input[type=file]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [mockFile], configurable: true });
      input.dispatchEvent(new Event('change'));

      expect(emitted.length).toBe(1);
      expect(emitted[0].name).toBe('chosen.mp3');
    });
  });
});
