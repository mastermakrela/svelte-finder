import type { ComponentProps } from 'svelte';
import { describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import Finder from './Finder.svelte';
import { memoryFS, type MemoryTree } from './adapters/memory.js';
import type { FinderEntry } from './fs.js';

const TREE: MemoryTree = { docs: { 'x.md': 'x' }, 'a.txt': 'a', 'b.txt': 'b', 'c.txt': 'c' };
const SEVEN: MemoryTree = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((n) => [`${n}.txt`, '']));
const GOTO_SHORTCUT = '{Control>}{Shift>}g{/Shift}{/Control}';

async function mount(
	props: Partial<ComponentProps<typeof Finder<FinderEntry>>> & { tree?: MemoryTree },
	box: { width?: string; dir?: 'rtl' } = {}
) {
	const { tree = TREE, ...rest } = props;
	const screen = await render(Finder, { fs: memoryFS(tree), ...rest });
	screen.container.style.width = box.width ?? '900px';
	screen.container.style.height = '600px';
	if (box.dir) screen.container.dir = box.dir;
	const root = screen.container.querySelector<HTMLElement>('[data-view]');
	if (!root) throw new Error('Finder did not render');
	const entry = async (path: string) => {
		await expect.poll(() => root.querySelector(`[data-path="${path}"]`)).toBeTruthy();
		// a list row carries data-path; the link or button inside it is what takes focus
		const el = root.querySelector<HTMLElement>(
			`:is(a, button)[data-path="${path}"], [data-path="${path}"] :is(a, button)`
		);
		if (!el) throw new Error(path);
		return el;
	};
	const selected = (path: string) =>
		root.querySelector<HTMLElement>(`[data-path="${path}"]`)?.dataset.selected;
	return { screen, root, entry, selected };
}

const focused = () => document.activeElement?.closest<HTMLElement>('[data-path]')?.dataset.path;

async function press(keys: string) {
	await userEvent.keyboard(keys);
	return focused();
}

describe('arrow keys move focus between entries', () => {
	test('list: Down and Up walk the entries in order and stop at the ends', async () => {
		const { entry } = await mount({ view: 'list' });
		(await entry('/docs')).focus();
		expect(await press('{ArrowDown}')).toBe('/a.txt');
		expect(await press('{ArrowDown}')).toBe('/b.txt');
		expect(await press('{ArrowDown}')).toBe('/c.txt');
		expect(await press('{ArrowDown}')).toBe('/c.txt');
		expect(await press('{ArrowUp}')).toBe('/b.txt');
		expect(await press('{ArrowUp}')).toBe('/a.txt');
		expect(await press('{ArrowUp}')).toBe('/docs');
		expect(await press('{ArrowUp}')).toBe('/docs');
	});

	// 480px leaves room for three 8.5rem tiles per row
	const PER_ROW = 3;
	const tile = (i: number) => `/${i + 1}.txt`;

	test('icons: Left and Right move by one entry, Up and Down by a row', async () => {
		const { entry } = await mount({ view: 'icons', tree: SEVEN }, { width: '480px' });
		(await entry(tile(0))).focus();
		expect(await press('{ArrowRight}')).toBe(tile(1));
		expect(await press('{ArrowDown}')).toBe(tile(1 + PER_ROW));
		expect(await press('{ArrowLeft}')).toBe(tile(PER_ROW));
		expect(await press('{ArrowUp}')).toBe(tile(0));
		expect(await press('{ArrowLeft}')).toBe(tile(0));
	});

	test('icons under dir="rtl": Left goes to the next entry, Right to the previous', async () => {
		const { entry } = await mount({ view: 'icons', tree: SEVEN }, { width: '480px', dir: 'rtl' });
		(await entry(tile(0))).focus();
		expect(await press('{ArrowLeft}')).toBe(tile(1));
		expect(await press('{ArrowLeft}')).toBe(tile(2));
		expect(await press('{ArrowRight}')).toBe(tile(1));
		expect(await press('{ArrowDown}')).toBe(tile(1 + PER_ROW));
	});

	test('columns: Right and Left cross to the neighbouring column', async () => {
		const { entry } = await mount({
			view: 'columns',
			path: '/src',
			tree: { src: { 'a.ts': '', 'b.ts': '' }, 'z.md': '' }
		});
		(await entry('/src')).focus();
		expect(await press('{ArrowRight}')).toBe('/src/a.ts');
		expect(await press('{ArrowDown}')).toBe('/src/b.ts');
		expect(await press('{ArrowLeft}')).toBe('/z.md');
		expect(await press('{ArrowUp}')).toBe('/src');
	});

	test('search results: Down walks the matches', async () => {
		const { screen, root, entry } = await mount({ view: 'icons' });
		await screen.getByRole('searchbox', { name: 'Search all files' }).fill('txt');
		await expect.poll(() => root.querySelectorAll('[data-path]').length).toBe(3);
		const matches = [...root.querySelectorAll<HTMLElement>('[data-path]')].map(
			(m) => m.dataset.path
		);
		(await entry(matches[0] ?? '')).focus();
		expect(await press('{ArrowDown}')).toBe(matches[1]);
		expect(await press('{ArrowDown}')).toBe(matches[2]);
		expect(await press('{ArrowUp}')).toBe(matches[1]);
	});

	test('the selection stays where it was', async () => {
		const { entry, selected } = await mount({ view: 'list' });
		await userEvent.click(await entry('/a.txt'));
		await expect.poll(() => selected('/a.txt')).toBe('true');
		expect(await press('{ArrowDown}')).toBe('/b.txt');
		expect(selected('/a.txt')).toBe('true');
		expect(selected('/b.txt')).toBe('false');
	});

	test('an arrow with Shift, Alt, Ctrl or Meta is left alone', async () => {
		const { entry } = await mount({ view: 'list' });
		(await entry('/a.txt')).focus();
		for (const key of ['Shift', 'Alt', 'Control', 'Meta']) {
			expect(await press(`{${key}>}{ArrowDown}{/${key}}`), key).toBe('/a.txt');
			expect(await press(`{${key}>}{ArrowUp}{/${key}}`), key).toBe('/a.txt');
		}
		expect(await press('{ArrowDown}')).toBe('/b.txt');
	});

	test('link entries move focus too', async () => {
		const { entry } = await mount({ view: 'list', href: (e) => `#${e.path}` });
		const first = await entry('/a.txt');
		expect(first.tagName).toBe('A');
		first.focus();
		expect(await press('{ArrowDown}')).toBe('/b.txt');
		expect(document.activeElement?.tagName).toBe('A');
	});
});

describe('focus stays in the Finder when navigating removes or disables the focused element', () => {
	async function expectFocusOnRoot(screen: Awaited<ReturnType<typeof mount>>['screen']) {
		const root = screen.container.querySelector<HTMLElement>('[data-view]');
		if (!root) throw new Error('Finder did not render');
		await expect.element(page.elementLocator(root)).toHaveFocus();
		await userEvent.keyboard(GOTO_SHORTCUT);
		await expect.element(screen.getByRole('combobox', { name: 'Go to folder' })).toBeVisible();
	}

	test('Enter on a folder', async () => {
		const { screen, entry } = await mount({ view: 'list' });
		(await entry('/docs')).focus();
		await userEvent.keyboard('{Enter}');
		await entry('/docs/x.md');
		await expectFocusOnRoot(screen);
	});

	test('a breadcrumb', async () => {
		const { screen, entry } = await mount({ view: 'list', path: '/docs' });
		await entry('/docs/x.md');
		await screen
			.getByRole('navigation', { name: 'Folder path' })
			.getByRole('button', { name: '/', exact: true })
			.click();
		await entry('/a.txt');
		await expectFocusOnRoot(screen);
	});

	test('Back until it disables itself', async () => {
		const { screen, entry } = await mount({ view: 'list' });
		(await entry('/docs')).focus();
		await userEvent.keyboard('{Enter}');
		await entry('/docs/x.md');
		const back = screen.getByRole('button', { name: 'Back' });
		await back.click();
		await entry('/a.txt');
		await expect.element(back).toBeDisabled();
		await expectFocusOnRoot(screen);
	});

	test.each([0, 150])('Go to folder (fs lists after %ims)', async (delay) => {
		const fs = memoryFS(TREE);
		const slow: typeof fs = {
			...fs,
			list: (path) => new Promise((done) => setTimeout(() => done(fs.list(path)), delay))
		};
		const { screen, entry } = await mount({ view: 'list', fs: slow });
		(await entry('/a.txt')).focus();
		await userEvent.keyboard(GOTO_SHORTCUT);
		await screen.getByRole('combobox', { name: 'Go to folder' }).fill('/docs/');
		await userEvent.keyboard('{Enter}');
		await entry('/docs/x.md');
		await expectFocusOnRoot(screen);
	});
});

describe('Go to folder', () => {
	async function openGoTo() {
		const { screen, entry, selected } = await mount({ view: 'list' });
		await entry('/a.txt');
		await screen.getByRole('button', { name: 'Go to folder' }).click();
		const combobox = screen.getByRole('combobox', { name: 'Go to folder', exact: true });
		await expect.element(combobox).toBeVisible();
		const input = combobox.element();
		const dialog = input.closest('dialog');
		if (!(input instanceof HTMLInputElement) || !dialog) throw new Error('no Go to folder dialog');
		const compose = (key: string) =>
			input.dispatchEvent(
				new KeyboardEvent('keydown', { key, isComposing: true, bubbles: true, cancelable: true })
			);
		return { screen, combobox, dialog, selected, compose };
	}

	test('the combobox is named "Go to folder"', async () => {
		const { combobox } = await openGoTo();
		await expect.element(combobox).toHaveAccessibleName('Go to folder');
	});

	test('arrows are ignored while an input method is composing', async () => {
		const { screen, compose } = await openGoTo();
		const options = screen.getByRole('option');
		await expect.poll(() => options.elements().length).toBe(4);
		compose('ArrowDown');
		compose('ArrowDown');
		await userEvent.keyboard('{ArrowDown}');
		await expect.element(options.nth(0)).toHaveAttribute('aria-selected', 'true');
		await expect.element(options.nth(2)).toHaveAttribute('aria-selected', 'false');
	});

	test('Enter is ignored while an input method is composing', async () => {
		const { combobox, dialog, selected, compose } = await openGoTo();
		await combobox.fill('/a');
		await expect.element(combobox).toHaveAttribute('aria-expanded', 'true');
		compose('Enter');
		expect(dialog.open).toBe(true);
		await userEvent.keyboard('{Enter}');
		expect(dialog.open).toBe(false);
		await expect.poll(() => selected('/a.txt')).toBe('true');
	});
});

test('each column resize handle controls its own column', async () => {
	const { screen, root } = await mount({
		view: 'columns',
		path: '/src',
		tree: { src: { 'a.ts': '' } }
	});
	await expect.poll(() => root.querySelectorAll('[role="separator"]').length).toBe(2);
	const handles = [...root.querySelectorAll('[role="separator"]')];
	const columns = [
		screen.getByRole('group', { name: '/', exact: true }).element(),
		screen.getByRole('group', { name: 'Folder /src', exact: true }).element()
	];
	handles.forEach((handle, i) => {
		const controls = handle.getAttribute('aria-controls');
		expect(controls).toBeTruthy();
		expect(document.getElementById(controls ?? '')).toBe(columns[i]);
	});
	expect(new Set(columns.map((c) => c.id)).size).toBe(2);
});
