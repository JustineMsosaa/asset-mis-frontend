import React, { useState } from 'react';
import {
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonPage,
    IonTitle,
    IonToolbar,
    useIonRouter,
} from '@ionic/react';
import { useLocation } from 'react-router-dom';
import {
    businessOutline,
    buildOutline,
    cartOutline,
    closeOutline,
    documentTextOutline,
    gridOutline,
    laptopOutline,
    logOutOutline,
    menuOutline,
    peopleOutline,
    settingsOutline,
    swapHorizontalOutline,
} from 'ionicons/icons';
import '../styles/MainLayout.css';

interface MenuItem {
    label: string;
    hint: string;
    path: string;
    icon: string;
}

const menuItems: MenuItem[] = [
    { label: 'Dashboard', hint: 'Fleet overview', path: '/home', icon: gridOutline },
    { label: 'Assets', hint: 'Register and search', path: '/assets', icon: laptopOutline },
    { label: 'Maintenance', hint: 'Repairs and service', path: '/maintenance', icon: buildOutline },
    { label: 'Procurement', hint: 'Orders and vendors', path: '/procurement', icon: cartOutline },
    { label: 'Branches', hint: 'Locations and stores', path: '/branches', icon: businessOutline },
    { label: 'Reports', hint: 'Audits and exports', path: '/reports', icon: documentTextOutline },
    { label: 'Users', hint: 'Staff and roles', path: '/users', icon: peopleOutline },
    { label: 'Settings', hint: 'Categories and rules', path: '/settings', icon: settingsOutline },
];

interface MainLayoutProps {
    title?: string;
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ title = 'AssetLink', children }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useIonRouter();
    const location = useLocation();

    const go = (path: string) => {
        setMenuOpen(false);
        if (location.pathname !== path) router.push(path);
    };

    return (
        <IonPage>
            <IonHeader>
                <IonToolbar>
                    <IonButtons slot="start">
                        <IonButton aria-label="Open menu" onClick={() => setMenuOpen(true)}>
                            <IonIcon slot="icon-only" icon={menuOutline} />
                        </IonButton>
                    </IonButtons>
                    <IonTitle>{title}</IonTitle>
                </IonToolbar>
            </IonHeader>

            <IonContent fullscreen>{children}</IonContent>

            <IonModal
                className="mainmenu-modal"
                isOpen={menuOpen}
                onDidDismiss={() => setMenuOpen(false)}
                aria-label="Main menu"
            >
                <IonHeader className='ion-no-border'>
                    <IonToolbar>
                        <IonTitle></IonTitle>
                        <IonButtons slot="end">
                            <IonButton aria-label="Close menu" onClick={() => setMenuOpen(false)}>
                                <IonIcon slot="icon-only" icon={closeOutline} />
                            </IonButton>
                        </IonButtons>
                    </IonToolbar>
                </IonHeader>

                <IonContent>
                    <div className="mainmenu">
                        <nav className="mainmenu-grid" aria-label="Main">
                            {menuItems.map((item) => {
                                const active = location.pathname === item.path;
                                return (
                                    <button
                                        key={item.path}
                                        type="button"
                                        className={active ? 'mainmenu-tile is-active' : 'mainmenu-tile'}
                                        aria-current={active ? 'page' : undefined}
                                        onClick={() => go(item.path)}
                                    >
                                        <span className="mainmenu-icon">
                                            <IonIcon icon={item.icon} />
                                        </span>
                                        <span className="mainmenu-text">
                                            <strong>{item.label}</strong>
                                            <small>{item.hint}</small>
                                        </span>
                                    </button>
                                );
                            })}
                        </nav>

                        <footer className="mainmenu-foot">
                            <div>
                                <strong>Chikondi M.</strong>
                                <small>Asset manager · Head Office</small>
                            </div>
                            <IonButton fill="outline" size="small" onClick={() => setMenuOpen(false)}>
                                <IonIcon slot="start" icon={logOutOutline} />
                                Sign out
                            </IonButton>
                        </footer>
                    </div>
                </IonContent>
            </IonModal>
        </IonPage>
    );
};

export default MainLayout;