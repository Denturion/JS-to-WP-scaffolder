/**
 * The Headless Optimizer — Admin Settings App
 *
 * A React component that reads and writes plugin settings via the WP REST API.
 *
 * Data flow analogy (JS equivalents in comments):
 *   wp_localize_script()    -> window.__INITIAL_STATE__ / import.meta.env
 *   apiFetch middleware     -> axios interceptors (adds auth header automatically)
 *   apiFetch({ path })      -> fetch('/wp-json/...')  OR  axios.get(url)
 *   wp_create_nonce()       -> JWT / CSRF token
 */
import { useState, useEffect } from '@wordpress/element';
import {
	Button,
	Card,
	CardBody,
	CardHeader,
	Notice,
	TextControl,
	__experimentalHeading as Heading,
} from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

/**
 * Data injected by PHP via wp_localize_script().
 * Analogous to: const { apiUrl, nonce } = window.__INITIAL_STATE__
 */
const { nonce } = window.headlessOptimizerData || {};

/**
 * Configure apiFetch to include the WP nonce on every request.
 *
 * Analogous to:
 *   axios.interceptors.request.use(config => {
 *     config.headers['X-WP-Nonce'] = nonce;
 *     return config;
 *   });
 */
if ( nonce ) {
	apiFetch.use( apiFetch.createNonceMiddleware( nonce ) );
}

/** API base path — analogous to axios baseURL */
const API_PATH = '/headless-optimizer/v1/settings';

/**
 * Default settings shape — mirrors the PHP $defaults array in Settings.php.
 * Analogous to: const initialState = { ... }
 */
const DEFAULT_SETTINGS = {
	allowed_origins: 'http://localhost:3000',
	cache_max_age: '300',
	disable_emojis: 'true',
	disable_feeds: 'true',
};

/**
 * Main App Component
 *
 * @returns {JSX.Element}
 */
export default function App() {
	const [ settings, setSettings ] = useState( DEFAULT_SETTINGS );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ notice, setNotice ]     = useState( null );

	/**
	 * Load settings on mount.
	 *
	 * Analogous to:
	 *   useEffect(() => {
	 *     fetch('/api/settings').then(r => r.json()).then(setSettings);
	 *   }, []);
	 */
	useEffect( () => {
		apiFetch( { path: API_PATH } )
			.then( ( data ) => setSettings( { ...DEFAULT_SETTINGS, ...data } ) )
			.catch( ( err ) =>
				setNotice( { status: 'error', message: err.message || 'Failed to load settings.' } )
			);
	}, [] );

	/**
	 * Handle a single field change.
	 * Analogous to: const handleChange = (key) => (value) => setState(s => ({ ...s, [key]: value }))
	 *
	 * @param {string} key   Setting key.
	 * @param {*}      value New value.
	 */
	const handleChange = ( key, value ) => {
		setSettings( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	/**
	 * Save settings via REST API.
	 *
	 * Analogous to:
	 *   fetch('/api/settings', { method: 'POST', body: JSON.stringify(settings) })
	 */
	const handleSave = async () => {
		setIsSaving( true );
		setNotice( null );

		try {
			const result = await apiFetch( {
				path:   API_PATH,
				method: 'POST',
				data:   settings,
			} );

			setSettings( { ...DEFAULT_SETTINGS, ...result.settings } );
			setNotice( { status: 'success', message: 'Settings saved successfully.' } );
		} catch ( err ) {
			setNotice( {
				status:  'error',
				message: err.message || 'An error occurred while saving settings.',
			} );
		} finally {
			setIsSaving( false );
		}
	};

	return (
		<div className="headless-optimizer-admin-wrap">
			<Heading level={ 1 }>The Headless Optimizer — Settings</Heading>

			{ notice && (
				<Notice
					status={ notice.status }
					isDismissible
					onRemove={ () => setNotice( null ) }
				>
					{ notice.message }
				</Notice>
			) }

			<Card>
				<CardHeader>
					<Heading level={ 3 }>Configuration</Heading>
				</CardHeader>
				<CardBody>
					<TextControl
						label="Allowed CORS Origins (comma-separated)"
						value={ settings.allowed_origins ?? '' }
						onChange={ ( value ) => handleChange( 'allowed_origins', value ) }
					/>
					<TextControl
						label="REST Cache Max-Age (seconds)"
						value={ settings.cache_max_age ?? '' }
						onChange={ ( value ) => handleChange( 'cache_max_age', value ) }
					/>
					<TextControl
						label="Disable WP Emoji Scripts"
						value={ settings.disable_emojis ?? '' }
						onChange={ ( value ) => handleChange( 'disable_emojis', value ) }
					/>
					<TextControl
						label="Disable RSS/Atom Feeds"
						value={ settings.disable_feeds ?? '' }
						onChange={ ( value ) => handleChange( 'disable_feeds', value ) }
					/>

					<Button
						variant="primary"
						onClick={ handleSave }
						isBusy={ isSaving }
						disabled={ isSaving }
					>
						{ isSaving ? 'Saving…' : 'Save Settings' }
					</Button>
				</CardBody>
			</Card>
		</div>
	);
}
