/**
 * The React Admin — Full-Screen Dashboard App
 *
 * A full-screen React app running inside WP Admin, styled with Tailwind CSS.
 * Replace the placeholder panels with your own data and components.
 *
 * Data flow:
 *   wp_localize_script() -> window.reactAdminDashboardData  (same as window.__INITIAL_STATE__)
 *   apiFetch             -> authenticated fetch() with WP nonce
 */
import { useState, useEffect, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';

const { nonce, siteUrl } = window.reactAdminDashboardData || {};

if ( nonce ) {
	apiFetch.use( apiFetch.createNonceMiddleware( nonce ) );
}

const API_SETTINGS = '/react-admin-dashboard/v1/settings';

const DEFAULT_SETTINGS = {
	dashboard_title: 'My Dashboard',
	primary_color:   'blue-600',
	items_per_page:  '10',
};

// ── Tiny reusable components (swap for your own design system) ──────────────

function StatCard( { label, value, trend, color = 'blue' } ) {
	return (
		<div className="stat-card">
			<span className="stat-label">{ label }</span>
			<span className={ `stat-value text-${ color }-600` }>{ value }</span>
			{ trend && (
				<span className={ `text-xs font-medium ${ trend > 0 ? 'text-green-600' : 'text-red-500' }` }>
					{ trend > 0 ? '↑' : '↓' } { Math.abs( trend ) }% vs last week
				</span>
			) }
		</div>
	);
}

function NavItem( { label, active, onClick } ) {
	return (
		<button
			onClick={ onClick }
			className={ `w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
				${ active
					? 'bg-blue-600 text-white'
					: 'text-gray-600 hover:bg-gray-100' }` }
		>
			{ label }
		</button>
	);
}

function Toast( { message, status, onClose } ) {
	useEffect( () => {
		const timer = setTimeout( onClose, 3500 );
		return () => clearTimeout( timer );
	}, [ onClose ] );

	const colors = {
		success: 'bg-green-50 border-green-200 text-green-800',
		error:   'bg-red-50 border-red-200 text-red-800',
	};

	return (
		<div className={ `fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${ colors[ status ] }` }>
			<span className="text-sm font-medium">{ message }</span>
			<button onClick={ onClose } className="text-lg leading-none opacity-60 hover:opacity-100">&times;</button>
		</div>
	);
}

// ── Panels ───────────────────────────────────────────────────────────────────

function OverviewPanel( { settings } ) {
	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold text-gray-800">{ settings.dashboard_title }</h2>

			{ /* Stat grid — replace these with real WP data via apiFetch */ }
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<StatCard label="Total Posts"   value="—"  color={ settings.primary_color?.split( '-' )[ 0 ] ?? 'blue' } />
				<StatCard label="Published"     value="—" />
				<StatCard label="Comments"      value="—" trend={ 12 } />
				<StatCard label="Active Users"  value="—" trend={ -3 } />
			</div>

			<div className="card">
				<h3 className="text-base font-semibold text-gray-700 mb-4">Recent Activity</h3>
				<p className="text-sm text-gray-500">
					No data yet — wire up <code className="bg-gray-100 px-1 rounded">apiFetch({'{ path: \'/wp/v2/posts\' }'})</code> here.
				</p>
			</div>

			<div className="card bg-blue-50 border-blue-100">
				<h3 className="text-sm font-semibold text-blue-700 mb-1">Quick start</h3>
				<p className="text-sm text-blue-600">
					Edit <code className="bg-blue-100 px-1 rounded">src/Admin/src/App.jsx</code> to replace these placeholders.
					Use <code className="bg-blue-100 px-1 rounded">apiFetch</code> to call the WP REST API — it handles auth automatically.
				</p>
			</div>
		</div>
	);
}

function SettingsPanel( { settings, onSave } ) {
	const [ local, setLocal ]     = useState( settings );
	const [ saving, setSaving ]   = useState( false );
	const [ dirty, setDirty ]     = useState( false );

	useEffect( () => {
		setLocal( settings );
		setDirty( false );
	}, [ settings ] );

	const change = ( key, val ) => {
		setLocal( ( s ) => ( { ...s, [ key ]: val } ) );
		setDirty( true );
	};

	const save = async () => {
		setSaving( true );
		await onSave( local );
		setSaving( false );
		setDirty( false );
	};

	return (
		<div className="space-y-6 max-w-lg">
			<h2 className="text-xl font-semibold text-gray-800">Settings</h2>

			<div className="card space-y-5">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Dashboard Title</label>
					<input
						type="text"
						value={ local.dashboard_title ?? '' }
						onChange={ ( e ) => change( 'dashboard_title', e.target.value ) }
						className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
						           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">
						Primary Color <span className="text-gray-400 font-normal">(Tailwind color name, e.g. blue-600)</span>
					</label>
					<input
						type="text"
						value={ local.primary_color ?? '' }
						onChange={ ( e ) => change( 'primary_color', e.target.value ) }
						className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
						           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
					<input
						type="number"
						min="1"
						max="100"
						value={ local.items_per_page ?? 10 }
						onChange={ ( e ) => change( 'items_per_page', e.target.value ) }
						className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
						           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					/>
				</div>

				<button
					onClick={ save }
					disabled={ saving || ! dirty }
					className={ `btn-primary disabled:opacity-50 disabled:cursor-not-allowed` }
				>
					{ saving ? 'Saving…' : 'Save Settings' }
				</button>
			</div>
		</div>
	);
}

// ── Root App ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'settings', label: 'Settings' },
];

export default function App() {
	const [ activePanel, setActivePanel ] = useState( 'overview' );
	const [ settings, setSettings ]       = useState( DEFAULT_SETTINGS );
	const [ toast, setToast ]             = useState( null );

	useEffect( () => {
		apiFetch( { path: API_SETTINGS } )
			.then( ( data ) => setSettings( { ...DEFAULT_SETTINGS, ...data } ) )
			.catch( () => setToast( { status: 'error', message: 'Could not load settings.' } ) );
	}, [] );

	const handleSave = useCallback( async ( newSettings ) => {
		try {
			const result = await apiFetch( { path: API_SETTINGS, method: 'POST', data: newSettings } );
			setSettings( { ...DEFAULT_SETTINGS, ...result.settings } );
			setToast( { status: 'success', message: 'Saved!' } );
		} catch ( err ) {
			setToast( { status: 'error', message: err.message || 'Save failed.' } );
		}
	}, [] );

	return (
		<div className="react-admin-dashboard-app flex min-h-screen bg-gray-50 font-sans">

			{ /* Sidebar navigation */ }
			<aside className="w-52 shrink-0 bg-white border-r border-gray-100 p-4 space-y-1">
				<p className="px-4 mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
					{ settings.dashboard_title }
				</p>
				{ NAV_ITEMS.map( ( item ) => (
					<NavItem
						key={ item.id }
						label={ item.label }
						active={ activePanel === item.id }
						onClick={ () => setActivePanel( item.id ) }
					/>
				) ) }
			</aside>

			{ /* Main content area */ }
			<main className="flex-1 p-8 overflow-auto">
				{ activePanel === 'overview' && <OverviewPanel settings={ settings } /> }
				{ activePanel === 'settings' && <SettingsPanel settings={ settings } onSave={ handleSave } /> }
			</main>

			{ toast && (
				<Toast
					message={ toast.message }
					status={ toast.status }
					onClose={ () => setToast( null ) }
				/>
			) }
		</div>
	);
}
