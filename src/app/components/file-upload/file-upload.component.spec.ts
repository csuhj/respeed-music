import { render, screen, fireEvent } from '@testing-library/angular';
import { vi } from 'vitest';
import { FileUploadComponent } from './file-upload.component';
import { FileUploadVm } from '../../models/view-models';

const EMPTY_VM: FileUploadVm = { isLoaded: false, fileName: '', duration: 0, error: null };
const LOADED_VM: FileUploadVm = { isLoaded: true, fileName: 'song.mp3', duration: 185, error: null };

async function setup(vm: FileUploadVm = EMPTY_VM) {
  return render(FileUploadComponent, { inputs: { vm } });
}

describe('FileUploadComponent', () => {
  it('creates successfully', async () => {
    const { fixture } = await setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('unloaded state', () => {
    it('shows the drop prompt', async () => {
      await setup();
      expect(screen.getByText('Drop an audio file here')).toBeTruthy();
    });

    it('does not show the loaded info panel', async () => {
      await setup();
      expect(screen.queryByText('Click or drop to load a different file')).toBeNull();
    });

    it('does not show an error message when error is null', async () => {
      const { container } = await setup();
      expect(container.querySelector('.error-message')).toBeNull();
    });
  });

  describe('loaded state', () => {
    it('hides the drop prompt', async () => {
      await setup(LOADED_VM);
      expect(screen.queryByText('Drop an audio file here')).toBeNull();
    });

    it('shows the file name', async () => {
      await setup(LOADED_VM);
      expect(screen.getByText('song.mp3')).toBeTruthy();
    });

    it('shows formatted duration', async () => {
      await setup(LOADED_VM);
      expect(screen.getByText('3:05')).toBeTruthy();
    });

    it('applies .loaded class to upload zone', async () => {
      await setup(LOADED_VM);
      const zone = screen.getByRole('button', { name: 'Upload audio file' });
      expect(zone.classList.contains('loaded')).toBe(true);
    });
  });

  describe('error state', () => {
    it('shows error message when vm.error is set', async () => {
      await setup({ ...EMPTY_VM, error: 'Unsupported format' });
      expect(screen.getByText('Unsupported format')).toBeTruthy();
    });
  });

  describe('file selection', () => {
    it('emits fileSelected when a file is dropped', async () => {
      const fileSelectedSpy = vi.fn();
      const { fixture } = await render(FileUploadComponent, {
        inputs: { vm: EMPTY_VM },
        on: { fileSelected: fileSelectedSpy },
      });

      const mockFile = new File(['audio'], 'dropped.mp3', { type: 'audio/mpeg' });
      fixture.componentInstance.onDrop({
        preventDefault: vi.fn(),
        dataTransfer: { files: [mockFile] },
      } as unknown as DragEvent);

      expect(fileSelectedSpy).toHaveBeenCalledTimes(1);
      expect(fileSelectedSpy.mock.calls[0][0].name).toBe('dropped.mp3');
    });

    it('emits fileSelected when a file is chosen via input', async () => {
      const fileSelectedSpy = vi.fn();
      const { container } = await render(FileUploadComponent, {
        inputs: { vm: EMPTY_VM },
        on: { fileSelected: fileSelectedSpy },
      });

      const mockFile = new File(['audio'], 'chosen.mp3', { type: 'audio/mpeg' });
      const input = container.querySelector('input[type=file]') as HTMLInputElement;
      Object.defineProperty(input, 'files', { value: [mockFile], configurable: true });
      fireEvent.change(input);

      expect(fileSelectedSpy).toHaveBeenCalledTimes(1);
      expect(fileSelectedSpy.mock.calls[0][0].name).toBe('chosen.mp3');
    });
  });
});
