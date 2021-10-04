import { MtvWorkflowState } from '@musicroom/types';
import { Button } from 'dripsy';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    AppScreen,
    AppScreenContainer,
    AppScreenHeader,
} from '../components/kit';
import { useMusicPlayer } from '../contexts/MusicPlayerContext';
import { useUserContext } from '../contexts/UserContext';
import { HomeTabHomeScreenScreenProps } from '../types';

const HomeScreen: React.FC<HomeTabHomeScreenScreenProps> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const musicPlayerMachine = useMusicPlayer();
    const { sendToUserMachine, state } = useUserContext();
    return (
        <AppScreen>
            <AppScreenHeader title="Home" insetTop={insets.top} />

            <AppScreenContainer>
                <Button
                    title="Go to Music Track Vote"
                    onPress={() => {
                        navigation.navigate('MusicTrackVoteSearch');
                    }}
                />

                <Button
                    title="Go settings"
                    onPress={() => {
                        navigation.navigate('Settings');
                    }}
                />
                <Button
                    title="Go chat"
                    onPress={() => {
                        navigation.navigate('Chat');
                    }}
                />

                <Button
                    title="Suggest track modal"
                    onPress={() => {
                        navigation.navigate('SuggestTrack', {
                            screen: 'SuggestTrackModal',
                        });
                    }}
                />

                <Button
                    title="Ask for geoloc"
                    onPress={() => {
                        sendToUserMachine({
                            type: 'REQUEST_DEDUPLICATE_LOCATION_PERMISSION',
                        });
                    }}
                />

                <Button
                    title="Inject fake room"
                    onPress={() => {
                        const fakeState: MtvWorkflowState = {
                            currentTrack: null,
                            name: 'JUST A FAKE ROOM',
                            playing: false,
                            roomCreatorUserID: 'JUST A CREATOR ID',
                            roomID: 'JUST A ROOM ID',
                            playingMode: 'BROADCAST',
                            tracks: null,
                            minimumScoreToBePlayed: 1,
                            isOpen: true,
                            isOpenOnlyInvitedUsersCanVote: false,
                            hasTimeAndPositionConstraints: false,
                            timeConstraintIsValid: null,
                            delegationOwnerUserID: null,
                            userRelatedInformation: {
                                hasControlAndDelegationPermission: true,
                                userFitsPositionConstraint: null,
                                emittingDeviceID: 'EMITTING DEVICE',
                                userID: 'JUST A USER ID',
                                tracksVotedFor: [],
                            },
                            usersLength: 2,
                        };

                        musicPlayerMachine.sendToMachine({
                            type: 'RETRIEVE_CONTEXT',
                            state: fakeState,
                        });
                    }}
                />
            </AppScreenContainer>
        </AppScreen>
    );
};

export default HomeScreen;
