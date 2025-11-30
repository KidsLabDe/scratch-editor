import React from 'react';
import ReactDomClient from 'react-dom/client';
import {compose} from 'redux';

import AppStateHOC from '../lib/app-state-hoc.jsx';
import GUI from '../containers/gui.jsx';
import HashParserHOC from '../lib/hash-parser-hoc.jsx';
import log from '../lib/log.js';
import {PLATFORM} from '../lib/platform.js';

const onClickLogo = () => {
    window.location = 'https://scratch.mit.edu';
};

// Backend URL from environment variable (set in webpack.config.js via DefinePlugin)
const LOCAL_BACKEND_HOST = process.env.BACKEND_URL;

// Helper to get cookie by name
const getCookie = name => {
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
    if (match) {
        try {
            return JSON.parse(decodeURIComponent(match[2]));
        } catch {
            return null;
        }
    }
    return null;
};

// Get session from cookie
const getSession = () => {
    return getCookie('student_session');
};

const accountMenuOptions = {
    canHaveSession: true,
    canRegister: true,
    canLogin: true,
    canLogout: true,
    myStuffUrl: `${LOCAL_BACKEND_HOST}/mystuff/`,
    profileUrl: `${LOCAL_BACKEND_HOST}/users/`,
    accountSettingsUrl: `${LOCAL_BACKEND_HOST}/account/settings/`,
};

// Simple login form renderer for local backend testing
const renderLogin = ({onClose}) => (
    <form
        style={{padding: '1rem'}}
        onSubmit={e => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const username = formData.get('username');
            const password = formData.get('password');
            // TODO: Implement your backend login API call here
            log(`Login attempt: ${username}`);
            fetch(`${LOCAL_BACKEND_HOST}/api/login`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password}),
                credentials: 'include'
            })
                .then(response => response.json())
                .then(data => {
                    log('Login response:', data);
                    onClose();
                    window.location.reload();
                })
                .catch(err => {
                    log('Login error:', err);
                });
        }}
    >
        <div style={{marginBottom: '0.5rem'}}>
            <label style={{display: 'block', marginBottom: '0.25rem'}}>Username</label>
            <input name="username" type="text" required style={{width: '100%', padding: '0.5rem'}} />
        </div>
        <div style={{marginBottom: '0.5rem'}}>
            <label style={{display: 'block', marginBottom: '0.25rem'}}>Password</label>
            <input name="password" type="password" required style={{width: '100%', padding: '0.5rem'}} />
        </div>
        <button type="submit" style={{width: '100%', padding: '0.5rem', cursor: 'pointer'}}>
            Sign In
        </button>
    </form>
);

const handleTelemetryModalCancel = () => {
    log('User canceled telemetry modal');
};

const handleTelemetryModalOptIn = () => {
    log('User opted into telemetry');
};

const handleTelemetryModalOptOut = () => {
    log('User opted out of telemetry');
};

/*
 * Render the GUI playground. This is a separate function because importing anything
 * that instantiates the VM causes unsupported browsers to crash
 * {object} appTarget - the DOM element to render to
 */
export default appTarget => {
    GUI.setAppElement(appTarget);

    // note that redux's 'compose' function is just being used as a general utility to make
    // the hierarchy of HOC constructor calls clearer here; it has nothing to do with redux's
    // ability to compose reducers.
    const WrappedGui = compose(
        AppStateHOC,
        HashParserHOC
    )(GUI);

    // TODO a hack for testing the backpack, allow backpack host to be set by url param
    const backpackHostMatches = window.location.href.match(/[?&]backpack_host=([^&]*)&?/);
    const backpackHost = backpackHostMatches ? backpackHostMatches[1] : null;

    const scratchDesktopMatches = window.location.href.match(/[?&]isScratchDesktop=([^&]+)/);
    let simulateScratchDesktop;
    if (scratchDesktopMatches) {
        try {
            // parse 'true' into `true`, 'false' into `false`, etc.
            simulateScratchDesktop = JSON.parse(scratchDesktopMatches[1]);
        } catch {
            // it's not JSON so just use the string
            // note that a typo like "falsy" will be treated as true
            simulateScratchDesktop = scratchDesktopMatches[1];
        }
    }

    if (process.env.NODE_ENV === 'production' && typeof window === 'object') {
        // Warn before navigating away
        window.onbeforeunload = () => true;
    }

    const root = ReactDomClient.createRoot(appTarget);

    // Fetch session from API and render
    fetch(`${LOCAL_BACKEND_HOST}/api/session`, {
        credentials: 'include'
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            return null;
        })
        .then(session => {
            // Handle response: { loggedIn: true, user: { name: "..." } }
            const username = session?.user?.name || session?.user?.username || null;
            log('Session from API:', session);
            log('Username:', username);

            root.render(
                // important: this is checking whether `simulateScratchDesktop` is truthy, not just defined!
                simulateScratchDesktop ?
                    <WrappedGui
                        canEditTitle
                        platform={PLATFORM.DESKTOP}
                        showTelemetryModal
                        canSave
                        username={username}
                        accountMenuOptions={accountMenuOptions}
                        renderLogin={renderLogin}
                        onTelemetryModalCancel={handleTelemetryModalCancel}
                        onTelemetryModalOptIn={handleTelemetryModalOptIn}
                        onTelemetryModalOptOut={handleTelemetryModalOptOut}
                    /> :
                    <WrappedGui
                        canEditTitle
                        backpackVisible
                        showComingSoon
                        backpackHost={backpackHost}
                        canSave
                        username={username}
                        projectHost={`${LOCAL_BACKEND_HOST}/projects`}
                        assetHost={`${LOCAL_BACKEND_HOST}/assets`}
                        accountMenuOptions={accountMenuOptions}
                        renderLogin={renderLogin}
                        onClickLogo={onClickLogo}
                    />
            );
        })
        .catch(err => {
            log('Session fetch error:', err);
            // Render without username on error
            root.render(
                <WrappedGui
                    canEditTitle
                    backpackVisible
                    showComingSoon
                    backpackHost={backpackHost}
                    canSave
                    accountMenuOptions={accountMenuOptions}
                    renderLogin={renderLogin}
                    onClickLogo={onClickLogo}
                />
            );
        });
};
