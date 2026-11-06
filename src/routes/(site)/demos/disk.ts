import { justBashFS, parentPath, withChangeFeed } from '#lib';
import { Bash } from 'just-bash/browser';

import { FILES, HOME } from './home.js';
import { loadPhotos } from './photos.js';

/** One just-bash shell, and the filesystem every window on the desktop browses. */
export class Disk {
	// One Bash for the page's lifetime: terminals, the editor and the app all hold on to it.
	bash = new Bash({ cwd: HOME, files: FILES });
	// just-bash has no change events: withChangeFeed adds a `watch` that fires on notify().
	fs = withChangeFeed(justBashFS(this.bash.fs));

	constructor() {
		void this.#photos();
	}

	#photos = async () => {
		const media = `${HOME}/site/media`;
		await this.bash.fs.mkdir(media, { recursive: true });
		for (const [name, bytes] of await loadPhotos())
			await this.bash.fs.writeFile(`${media}/${name}`, bytes);
		this.fs.notify();
	};

	read = (path: string) => this.bash.fs.readFile(path);

	write = async (path: string, text: string) => {
		// the folder may have been removed from the terminal meanwhile
		await this.bash.fs.mkdir(parentPath(path), { recursive: true });
		await this.bash.fs.writeFile(path, text);
		this.fs.notify(); // every Finder on this fs lists again
	};

	reset = async () => {
		await this.bash.fs.rm(HOME, { recursive: true, force: true });
		for (const [path, text] of Object.entries(FILES)) {
			await this.bash.fs.mkdir(parentPath(path), { recursive: true });
			await this.bash.fs.writeFile(path, text);
		}
		await this.#photos();
	};
}
