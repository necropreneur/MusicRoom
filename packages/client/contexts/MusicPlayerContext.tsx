import { MtvPlayingModes } from '@musicroom/types';
import { useMachine } from '@xstate/react';
import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { Sender } from 'xstate';
import { MusicPlayerRef } from '../components/TheMusicPlayer/Player';
import {
    MusicPlayerFullScreenProps,
    useMusicPlayerToggleFullScreen,
} from '../hooks/musicPlayerToggle';
import {
    AppMusicPlayerMachineEvent,
    AppMusicPlayerMachineState,
    createAppMusicPlayerMachine,
} from '../machines/appMusicPlayerMachine';
import { CreationMtvRoomFormActorRef } from '../machines/creationMtvRoomForm';
import { navigateFromRef } from '../navigation/RootNavigation';
import { Socket } from '../services/websockets';
import { useUserContext } from './UserContext';

type MusicPlayerContextValue = {
    sendToMachine: Sender<AppMusicPlayerMachineEvent>;
    state: AppMusicPlayerMachineState;
    setPlayerRef: (ref: MusicPlayerRef) => void;
    isDeviceEmitting: boolean;
} & MusicPlayerFullScreenProps;

const MusicPlayerContext = React.createContext<
    MusicPlayerContextValue | undefined
>(undefined);

type MusicPlayerContextProviderProps = {
    socket: Socket;
    setDisplayModal: (display: boolean) => void;
};

// TODO: See if we need to optimize the performances
export const MusicPlayerContextProvider: React.FC<MusicPlayerContextProviderProps> =
    ({ socket, setDisplayModal, children }) => {
        const playerRef = useRef<MusicPlayerRef | null>(null);
        const { isFullScreen, setIsFullScreen, toggleIsFullScreen } =
            useMusicPlayerToggleFullScreen(false);
        const { sendToUserMachine, state: userState } = useUserContext();

        const appMusicPlayerMachine = createAppMusicPlayerMachine({ socket });
        const [state, send] = useMachine(appMusicPlayerMachine, {
            services: {
                listenForFocus: () => (sendBack) => {
                    const listener = () => {
                        console.log('SENDING FOCUS READY');
                        sendBack('FOCUS_READY');
                    };

                    //Can't be using always props in state machine as invoke is called before it
                    if (Platform.OS !== 'web') {
                        listener();
                        return;
                    }

                    document.addEventListener('click', listener);
                    setDisplayModal(true);

                    return () => {
                        console.log('___CLEANUP___');
                        document.removeEventListener('click', listener);
                        setDisplayModal(false);
                    };
                },

                pollTrackElapsedTime: () => (sendBack) => {
                    const INTERVAL = 1000;
                    // eslint-disable-next-line @typescript-eslint/no-misused-promises
                    const timerId = setInterval(async () => {
                        try {
                            const elapsedTime =
                                await fetchMusicPlayerElapsedTime();

                            sendBack({
                                type: 'UPDATE_CURRENT_TRACK_ELAPSED_TIME',
                                elapsedTime,
                            });
                        } catch (err) {
                            console.error(err);
                        }
                    }, INTERVAL);

                    return () => {
                        clearInterval(timerId);
                    };
                },
            },
            actions: {
                ifRoomHasPositionConstraintsAskForLocationPermission: (
                    context,
                ) => {
                    if (context.hasTimeAndPositionConstraints) {
                        sendToUserMachine({
                            type: 'REQUEST_LOCATION_PERMISSION',
                        });
                    }
                },

                leaveRoomFromLeaveRoomButton: () => {
                    setIsFullScreen(false);
                    navigateFromRef('HomeScreen');
                },

                displayAlertForcedDisconnection: () => {
                    setIsFullScreen(false);
                    navigateFromRef('HomeScreen');
                    navigateFromRef('Alert', {
                        reason: 'FORCED_DISCONNECTION',
                    });
                },

                showTracksSuggestionAcknowledgementToast: () => {
                    Toast.show({
                        type: 'success',
                        text1: 'Track suggestion',
                        text2: 'Your suggestion has been accepted',
                    });
                },

                showTracksSuggestionFailedToast: () => {
                    Toast.show({
                        type: 'error',
                        text1: 'Track suggestion',
                        text2: 'Your suggestion has been rejected',
                    });
                },

                openCreationMtvRoomFormModal: () => {
                    navigateFromRef('MusicTrackVoteCreationForm', {
                        screen: 'MusicTrackVoteCreationFormName',
                    });
                },

                closeCreationMtvRoomFormModal: ({
                    closeMtvRoomCreationModal,
                }) => {
                    closeMtvRoomCreationModal?.();
                },
            },
        });
        const { context } = state;
        const roomIsNotReady = !state.hasTag('roomIsReady');

        const isDeviceOwnerTheDelegationOwner = useCallback(
            function isDeviceOwnerTheDelegationOwner(): boolean {
                const roomIsNotInDirectMode =
                    context.playingMode !== MtvPlayingModes.Values.DIRECT;
                if (roomIsNotInDirectMode) {
                    return false;
                }

                if (context.userRelatedInformation === null) {
                    return false;
                }

                const deviceOwnerIsNotTheDelegationOwner =
                    context.delegationOwnerUserID === null ||
                    context.delegationOwnerUserID !==
                        context.userRelatedInformation.userID;
                if (deviceOwnerIsNotTheDelegationOwner) {
                    return false;
                }

                return true;
            },
            [context],
        );

        const isDeviceEmitting: boolean = useMemo(
            (): boolean => {
                if (roomIsNotReady) {
                    return false;
                }

                if (context.userRelatedInformation === null) {
                    return false;
                }

                const thisDeviceIsNotEmitting =
                    userState.context.currDeviceID !==
                    context.userRelatedInformation.emittingDeviceID;
                if (thisDeviceIsNotEmitting) {
                    return false;
                }

                const roomIsInDirectMode =
                    context.playingMode === MtvPlayingModes.Values.DIRECT;
                if (roomIsInDirectMode) {
                    return isDeviceOwnerTheDelegationOwner();
                }

                return true;
            },
            //Not optimal at all, function will be defined each time
            //Ok for semantic, we will se later for performances
            [
                roomIsNotReady,
                context,
                userState.context,
                isDeviceOwnerTheDelegationOwner,
            ],
        );

        function setPlayerRef(ref: MusicPlayerRef) {
            playerRef.current = ref;

            send({
                type: 'MUSIC_PLAYER_REFERENCE_HAS_BEEN_SET',
            });
        }

        async function fetchMusicPlayerElapsedTime(): Promise<number> {
            const player = playerRef.current;
            if (player === null) {
                throw new Error(
                    'playerRef is null, the reference has not been set correctly',
                );
            }

            const elapsedTime: number = await player.getCurrentTime();

            return elapsedTime * 1000;
        }

        return (
            <MusicPlayerContext.Provider
                value={{
                    sendToMachine: send,
                    state,
                    setPlayerRef,
                    isFullScreen,
                    setIsFullScreen,
                    toggleIsFullScreen,
                    isDeviceEmitting,
                }}
            >
                {children}
            </MusicPlayerContext.Provider>
        );
    };

export function useMusicPlayer(): MusicPlayerContextValue {
    const context = useContext(MusicPlayerContext);
    if (context === undefined) {
        throw new Error(
            'useMusicPlayer must be used within a MusicPlayerContextProvider',
        );
    }

    return context;
}

export function useSuggestTracks(closeSuggestionModal: () => void): {
    suggestTracks: (tracksIDs: string[]) => void;
    showActivityIndicatorOnSuggestionsResultsScreen: boolean;
} {
    const { sendToMachine, state } = useMusicPlayer();

    function suggestTracks(tracksIDs: string[]) {
        sendToMachine({
            type: 'SUGGEST_TRACKS',
            tracksToSuggest: tracksIDs,
            closeSuggestionModal,
        });
    }

    const showActivityIndicatorOnSuggestionsResultsScreen = state.hasTag(
        'showActivityIndicatorOnSuggestionsResultsScreen',
    );

    return {
        suggestTracks,
        showActivityIndicatorOnSuggestionsResultsScreen,
    };
}

export function useCreationMtvRoomFormMachine():
    | CreationMtvRoomFormActorRef
    | undefined {
    const { state } = useMusicPlayer();
    const actor: CreationMtvRoomFormActorRef =
        state.children.creationMtvRoomForm;

    return actor ?? undefined;
}
