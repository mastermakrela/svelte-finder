import { createSubscriber } from 'svelte/reactivity';

// The site's theme toggle flips `.dark` on <html>; read it reactively.
const subscribe = createSubscriber((update) => {
	const observer = new MutationObserver(update);
	observer.observe(document.documentElement, { attributeFilter: ['class'] });
	return () => observer.disconnect();
});

export const isDark = () => {
	subscribe();
	return document.documentElement.classList.contains('dark');
};
