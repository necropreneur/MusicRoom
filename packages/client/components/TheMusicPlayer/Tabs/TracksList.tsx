import { Ionicons } from '@expo/vector-icons';
import { TrackMetadataWithScore } from '@musicroom/types';
import { useNavigation } from '@react-navigation/core';
import { Sender } from '@xstate/react/lib/types';
import { useSx, View } from 'dripsy';
import { music } from 'faker';
import React from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import {
    AppMusicPlayerMachineContext,
    AppMusicPlayerMachineEvent,
} from '../../../machines/appMusicPlayerMachine';
import TrackListItemWithScore from '../../Track/TrackListItemWithScore';

interface TracksListProps {
    musicPlayerMachineContext: AppMusicPlayerMachineContext;
    sendToMusicPlayerMachine: Sender<AppMusicPlayerMachineEvent>;
}

interface AddSongButtonProps {
    onPress: () => void;
}

const AddSongButton: React.FC<AddSongButtonProps> = ({ onPress }) => {
    const sx = useSx();

    return (
        <TouchableOpacity
            style={sx({
                position: 'absolute',
                right: 0,
                bottom: 0,
                borderRadius: 'full',
                backgroundColor: 'secondary',
                width: 48,
                height: 48,
                margin: 'm',
                justifyContent: 'center',
                alignItems: 'center',

                // Copy pasted from https://ethercreative.github.io/react-native-shadow-generator/
                shadowColor: '#000',
                shadowOffset: {
                    width: 0,
                    height: 2,
                },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,

                elevation: 5,
            })}
            onPress={onPress}
        >
            <Ionicons
                accessibilityLabel="Suggest a track"
                name="add"
                size={32}
                color="white"
                style={{
                    // Necessary to center the icon visually
                    right: -1,
                }}
            />
        </TouchableOpacity>
    );
};

function getRoomIsOpenAndOnlyInvitedUsersCanVote(
    musicPlayerMachineContext: AppMusicPlayerMachineContext,
) {
    //The room should be open
    const roomIsNotOpen = musicPlayerMachineContext.isOpen === false;
    if (roomIsNotOpen) {
        return false;
    }

    //The room should be on Only invited users can vote
    const onlyInvitedUsersCanVoteIsNotEnabled =
        musicPlayerMachineContext.isOpenOnlyInvitedUsersCanVote === false;
    if (onlyInvitedUsersCanVoteIsNotEnabled) {
        return false;
    }
}

function getUserHasNotBeenInvited(
    musicPlayerMachineContext: AppMusicPlayerMachineContext,
) {
    //The userRelatedInformation should be defined
    if (musicPlayerMachineContext.userRelatedInformation === null) {
        return true;
    }

    //The user should be invited to the room
    const userHasNotBeenInvited =
        musicPlayerMachineContext.userRelatedInformation.userHasBeenInvited ===
        false;

    return userHasNotBeenInvited;
}

// function getTimeAndPositionConstraintsAreMet(
//     musicPlayerMachineContext: AppMusicPlayerMachineContext,
// );

const TracksListTab: React.FC<TracksListProps> = ({
    musicPlayerMachineContext,
    sendToMusicPlayerMachine,
}) => {
    const navigation = useNavigation();

    if (musicPlayerMachineContext.tracks === null) {
        return null;
    }

    const userOutsideOfTimeAndPhysicalBounds =
        musicPlayerMachineContext.hasTimeAndPositionConstraints === true &&
        (musicPlayerMachineContext.timeConstraintIsValid === false ||
            musicPlayerMachineContext.userRelatedInformation
                ?.userFitsPositionConstraint !== true);

    const roomIsOpenAndOnlyInvitedUsersCanVote =
        getRoomIsOpenAndOnlyInvitedUsersCanVote(musicPlayerMachineContext);
    let roomIsOpenAndOnlyInvitedUsersCanVoteAndUserHasNotBeenInvited = false;
    if (roomIsOpenAndOnlyInvitedUsersCanVote) {
        roomIsOpenAndOnlyInvitedUsersCanVoteAndUserHasNotBeenInvited =
            getUserHasNotBeenInvited(musicPlayerMachineContext);
    }

    function generateTracksListItems(): (
        | { type: 'TRACK'; track: TrackMetadataWithScore }
        | { type: 'SEPARATOR' }
    )[] {
        if (musicPlayerMachineContext.tracks === null) {
            return [];
        }

        const formattedTracksListItem = musicPlayerMachineContext.tracks.map<{
            type: 'TRACK';
            track: TrackMetadataWithScore;
        }>((track) => ({
            type: 'TRACK',
            track,
        }));
        const firstSuggestedTrackIndex =
            musicPlayerMachineContext.tracks.findIndex(
                (track) =>
                    track.score <
                    musicPlayerMachineContext.minimumScoreToBePlayed,
            );

        if (
            firstSuggestedTrackIndex === -1 ||
            firstSuggestedTrackIndex ===
                musicPlayerMachineContext.tracks.length - 1
        ) {
            return formattedTracksListItem;
        }

        return [
            ...formattedTracksListItem.slice(0, firstSuggestedTrackIndex),
            {
                type: 'SEPARATOR',
            },
            ...formattedTracksListItem.slice(firstSuggestedTrackIndex),
        ];
    }

    const data = generateTracksListItems();

    return (
        <View sx={{ flex: 1 }}>
            <FlatList
                data={data}
                renderItem={({ item, index }) => {
                    if (item.type === 'SEPARATOR') {
                        return (
                            <View
                                sx={{
                                    height: 1,
                                    width: '100%',
                                    backgroundColor: 'white',

                                    marginBottom: 'm',
                                }}
                            />
                        );
                    }

                    const { id: trackID } = item.track;

                    let userHasAlreadyVotedForTrack = false;
                    if (
                        musicPlayerMachineContext.userRelatedInformation !==
                        null
                    ) {
                        userHasAlreadyVotedForTrack =
                            musicPlayerMachineContext.userRelatedInformation.tracksVotedFor.some(
                                (trackIDVotedFor) =>
                                    trackIDVotedFor === trackID,
                            );
                    }

                    const disableTrackListItem =
                        userHasAlreadyVotedForTrack ||
                        roomIsOpenAndOnlyInvitedUsersCanVoteAndUserHasNotBeenInvited ||
                        userOutsideOfTimeAndPhysicalBounds;

                    return (
                        <View
                            sx={{
                                marginBottom: 'm',
                            }}
                        >
                            <TrackListItemWithScore
                                index={index + 1}
                                track={item.track}
                                userHasAlreadyVotedForTrack={
                                    userHasAlreadyVotedForTrack
                                }
                                minimumScore={
                                    musicPlayerMachineContext.minimumScoreToBePlayed
                                }
                                disabled={disableTrackListItem}
                                accessibilityLabel="Press to vote for this track"
                                onPress={() => {
                                    sendToMusicPlayerMachine({
                                        type: 'VOTE_FOR_TRACK',
                                        trackID,
                                    });
                                }}
                            />
                        </View>
                    );
                }}
                extraData={musicPlayerMachineContext}
                keyExtractor={(item, _) => {
                    if (item.type === 'TRACK') {
                        return item.track.id;
                    }
                    return 'SEPARATOR_KEY';
                }}
                style={{ flex: 1 }}
            />

            <AddSongButton
                onPress={() => {
                    navigation.navigate('SuggestTrack');
                }}
            />
        </View>
    );
};

export default TracksListTab;
