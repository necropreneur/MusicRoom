package mpe

import (
	shared_mpe "github.com/AdonisEnProvence/MusicRoom/mpe/shared"
	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/Devessier/brainy"
)

type MpeRoomInitialTrackFetchedEvent struct {
	brainy.EventWithType

	Tracks []shared.TrackMetadata
}

func NewMpeRoomInitialTracksFetchedEvent(tracks []shared.TrackMetadata) MpeRoomInitialTrackFetchedEvent {
	return MpeRoomInitialTrackFetchedEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomInitialTracksFetched,
		},
		Tracks: tracks,
	}
}

type MpeRoomAddTracksEvent struct {
	brainy.EventWithType

	TracksIDs []string
	UserID    string
	DeviceID  string
}

type NewMpeRoomAddTracksEventArgs struct {
	TracksIDs []string
	UserID    string
	DeviceID  string
}

func NewMpeRoomAddTracksEvent(args NewMpeRoomAddTracksEventArgs) MpeRoomAddTracksEvent {
	return MpeRoomAddTracksEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomAddTracksEventType,
		},

		TracksIDs: args.TracksIDs,
		UserID:    args.UserID,
		DeviceID:  args.DeviceID,
	}
}

type MpeRoomAddedTracksInformationFetchedEvent struct {
	brainy.EventWithType

	AddedTracksInformation []shared.TrackMetadata
	UserID                 string
	DeviceID               string
}

type NewMpeRoomAddedTracksInformationFetchedEventArgs struct {
	AddedTracksInformation []shared.TrackMetadata
	UserID                 string
	DeviceID               string
}

func NewMpeRoomAddedTracksInformationFetchedEvent(args NewMpeRoomAddedTracksInformationFetchedEventArgs) MpeRoomAddedTracksInformationFetchedEvent {
	return MpeRoomAddedTracksInformationFetchedEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomAddedTracksInformationFetchedEventType,
		},

		AddedTracksInformation: args.AddedTracksInformation,
		UserID:                 args.UserID,
		DeviceID:               args.DeviceID,
	}
}

type MpeRoomChangeTrackOrderEvent struct {
	brainy.EventWithType

	TrackID          string
	UserID           string
	DeviceID         string
	OperationToApply shared_mpe.MpeOperationToApplyValue
	FromIndex        int
}

type NewMpeRoomChangeTrackOrderEventArgs struct {
	TrackID          string
	UserID           string
	DeviceID         string
	OperationToApply shared_mpe.MpeOperationToApplyValue
	FromIndex        int
}

func NewMpeRoomChangeTrackOrderEvent(args NewMpeRoomChangeTrackOrderEventArgs) MpeRoomChangeTrackOrderEvent {
	return MpeRoomChangeTrackOrderEvent{
		EventWithType: brainy.EventWithType{
			Event: MpeRoomChangeTrackOrderEventType,
		},

		TrackID:          args.TrackID,
		UserID:           args.UserID,
		DeviceID:         args.DeviceID,
		OperationToApply: args.OperationToApply,
		FromIndex:        args.FromIndex,
	}
}
