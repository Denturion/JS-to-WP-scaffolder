/**
 * The API Bridge — Admin Settings App
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
const { nonce } = window.apiBridgeData || {};

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
const API_PATH = '/api-bridge/v1/settings';

/**
 * Default settings shape — mirrors the PHP $defaults array in Settings.php.
 * Analogous to: const initialState = { ... }
 */
const DEFAULT_SETTINGS = {
	api_key: '',
	api_base_url: 'https://api.example.com/v1',
	request_timeout: '30',
	enable_caching: 'true',
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
		<div className="api-bridge-admin-wrap">
			<Heading level={ 1 }>The API Bridge — Settings</Heading>

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
						label="API Key"
						value={ settings.api_key ?? '' }
						onChange={ ( value ) => handleChange( 'api_key', value ) }
					/>
					<TextControl
						label="API Base URL"
						value={ settings.api_base_url ?? '' }
						onChange={ ( value ) => handleChange( 'api_base_url', value ) }
					/>
					<TextControl
						label="Request Timeout (seconds)"
						value={ settings.request_timeout ?? '' }
						onChange={ ( value ) => handleChange( 'request_timeout', value ) }
					/>
					<TextControl
						label="Enable Response Caching"
						value={ settings.enable_caching ?? '' }
						onChange={ ( value ) => handleChange( 'enable_caching', value ) }
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
