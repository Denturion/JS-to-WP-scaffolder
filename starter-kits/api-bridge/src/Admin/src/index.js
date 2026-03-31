/**
 * The API Bridge Admin — React Entry Point
 *
 * Analogous to: src/index.js in a Create React App / Vite project.
 *
 * @wordpress/element wraps React so WP controls the React version globally.
 * Using it (instead of importing React directly) means your bundle shares
 * the same React instance as Gutenberg — smaller bundle, no version conflicts.
 *
 * wp_enqueue_script() in AdminInit.php loads this file. WordPress injects it
 * into the page after the admin shell <div> has been rendered, so the mount
 * target is guaranteed to exist when this runs.
 */
import { createRoot } from '@wordpress/element';
import App from './App';
import './index.css';

const rootElement = document.getElementById( 'api-bridge-admin-root' );

if ( rootElement ) {
	/**
	 * Mount the React app.
	 * Analogous to: ReactDOM.createRoot(document.getElementById('root')).render(<App />)
	 */
	const root = createRoot( rootElement );
	root.render( <App /> );
}
