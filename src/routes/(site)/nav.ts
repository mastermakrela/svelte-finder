export const GROUPS = [
	{
		items: [
			{ id: 'install', title: 'Install' },
			{ id: 'quick-start', title: 'Quick start' }
		],
		title: 'Start'
	},
	{
		items: [
			{ id: 'views', title: 'Views' },
			{ id: 'selection', title: 'Selection and events' },
			{ id: 'filesystems', title: 'Filesystems' }
		],
		title: 'Finder'
	},
	{
		items: [
			{ id: 'styling', title: 'Styling' },
			{ id: 'api', title: 'API' }
		],
		title: 'Reference'
	}
];

export const SECTIONS = GROUPS.flatMap((group) => group.items);
