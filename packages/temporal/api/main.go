package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/AdonisEnProvence/MusicRoom/shared"
	"github.com/AdonisEnProvence/MusicRoom/workflows"

	"github.com/bojanz/httpx"
	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
	"go.temporal.io/sdk/client"
)

type (
	ErrorResponse struct {
		Message string
	}

	UpdateEmailRequest struct {
		Email string
	}

	CheckoutRequest struct {
		Email string
	}
)

var (
	HTTPPort = os.Getenv("PORT")
	temporal client.Client
)

func main() {
	var err error
	temporal, err = client.NewClient(client.Options{})
	if err != nil {
		log.Fatalln("unable to create Temporal client", err)
	}

	r := mux.NewRouter()

	r.Handle("/ping", http.HandlerFunc(PingHandler)).Methods(http.MethodGet)
	r.Handle("/play", http.HandlerFunc(PlayHandler)).Methods(http.MethodPut)
	r.Handle("/pause", http.HandlerFunc(PauseHandler)).Methods(http.MethodPut)
	r.Handle("/create", http.HandlerFunc(CreateRoomHandler)).Methods(http.MethodPut)
	r.Handle("/join", http.HandlerFunc(JoinRoomHandler)).Methods(http.MethodPut)
	r.Handle("/vote-for-track", http.HandlerFunc(VoteForTrackHandler)).Methods(http.MethodPut)
	r.Handle("/leave", http.HandlerFunc(LeaveRoomHandler)).Methods(http.MethodPut)
	r.Handle("/change-user-emitting-device", http.HandlerFunc(ChangeUserEmittingDeviceHandler)).Methods(http.MethodPut)
	r.Handle("/update-user-fits-position-constraint", http.HandlerFunc(UpdateUserFitsPositionConstraintHandler)).Methods(http.MethodPut)
	r.Handle("/state", http.HandlerFunc(GetStateHandler)).Methods(http.MethodPut)
	r.Handle("/users-list", http.HandlerFunc(GetUsersListHandler)).Methods(http.MethodPut)
	r.Handle("/go-to-next-track", http.HandlerFunc(GoToNextTrackHandler)).Methods(http.MethodPut)
	r.Handle("/suggest-tracks", http.HandlerFunc(SuggestTracksHandler)).Methods(http.MethodPut)
	r.Handle("/terminate", http.HandlerFunc(TerminateWorkflowHandler)).Methods(http.MethodPut)
	r.Handle("/update-delegation-owner", http.HandlerFunc(UpdateDelegationOwnerHandler)).Methods(http.MethodPut)
	r.Handle("/update-control-and-delegation-permission", http.HandlerFunc(UpdateControlAndDelegationPermissionHandler)).Methods(http.MethodPut)

	r.NotFoundHandler = http.HandlerFunc(NotFoundHandler)

	var cors = handlers.CORS(handlers.AllowedHeaders([]string{"X-Requested-With", "Content-Type", "Authorization"}), handlers.AllowedMethods([]string{"GET", "POST", "PUT", "HEAD", "OPTIONS"}), handlers.AllowedOrigins([]string{"*"}))

	http.Handle("/", cors(r))
	server := httpx.NewServer(":"+HTTPPort, http.DefaultServeMux)
	server.WriteTimeout = time.Second * 240

	fmt.Println("Server is listening on PORT: " + os.Getenv("PORT"))
	err = server.Start()
	if err != nil {
		log.Fatal(err)
	}
}

type PlayRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
	UserID     string `json:"userID" validate:"required,uuid"`
}

func PlayHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body PlayRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared.NewPlaySignal(shared.NewPlaySignalArgs{
		UserID: body.UserID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		signal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type PauseRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
	UserID     string `json:"userID" validate:"required,uuid"`
}

func PauseHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body PauseRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared.NewPauseSignal(shared.NewPauseSignalArgs{
		UserID: body.UserID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		signal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type GoToNextTrackRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
	UserID     string `json:"userID" validate:"required,uuid"`
}

func GoToNextTrackHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body GoToNextTrackRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	goToNextTrackSignal := shared.NewGoToNexTrackSignal(shared.NewGoToNextTrackSignalArgs{
		UserID: body.UserID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		goToNextTrackSignal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type VoteForTrackHandlerRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
	TrackID    string `json:"trackID" validate:"required"`
	UserID     string `json:"userID" validate:"required,uuid"`
}

func VoteForTrackHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body VoteForTrackHandlerRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	voteForTrackSignal := shared.NewVoteForTrackSignal(shared.NewVoteForTrackSignalArgs{
		TrackID: body.TrackID,
		UserID:  body.UserID,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		voteForTrackSignal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type ChangeUserEmittingDeviceRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
	UserID     string `json:"userID" validate:"required,uuid"`
	DeviceID   string `json:"deviceID" validate:"required,uuid"`
}

func ChangeUserEmittingDeviceHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body ChangeUserEmittingDeviceRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	args := shared.ChangeUserEmittingDeviceSignalArgs{
		UserID:   body.UserID,
		DeviceID: body.DeviceID,
	}
	changeUserEmittingDeviceSignal := shared.NewChangeUserEmittingDeviceSignal(args)

	fmt.Println("**********ChangeUserEmittingDeviceHandler**********")

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		changeUserEmittingDeviceSignal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type SuggestTracksRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`

	TracksToSuggest []string `json:"tracksToSuggest" validate:"required,dive,required"`
	UserID          string   `json:"userID" validate:"required,uuid"`
	DeviceID        string   `json:"deviceID" validate:"required,uuid"`
}

func SuggestTracksHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body SuggestTracksRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	suggestTracksSignal := shared.NewSuggestTracksSignal(shared.SuggestTracksSignalArgs{
		TracksToSuggest: body.TracksToSuggest,
		UserID:          body.UserID,
		DeviceID:        body.DeviceID,
	})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		suggestTracksSignal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type TerminateWorkflowRequestBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
}

func TerminateWorkflowHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body TerminateWorkflowRequestBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	terminateSignal := shared.NewTerminateSignal(shared.NewTerminateSignalArgs{})
	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		terminateSignal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type CreateRoomRequestBody struct {
	WorkflowID       string   `json:"workflowID" validate:"required,uuid"`
	UserID           string   `json:"userID" validate:"required,uuid"`
	DeviceID         string   `json:"deviceID" validate:"required,uuid"`
	Name             string   `json:"name" validate:"required"`
	InitialTracksIDs []string `json:"initialTracksIDs" validate:"required,dive,required"`

	MinimumScoreToBePlayed        int                                       `json:"minimumScoreToBePlayed" validate:"required"`
	IsOpen                        bool                                      `json:"isOpen"`
	IsOpenOnlyInvitedUsersCanVote bool                                      `json:"isOpenOnlyInvitedUsersCanVote"`
	HasPhysicalAndTimeConstraints bool                                      `json:"hasPhysicalAndTimeConstraints"`
	PhysicalAndTimeConstraints    *shared.MtvRoomPhysicalAndTimeConstraints `json:"physicalAndTimeConstraints" validate:"required_if=HasPhysicalAndTimeConstraints true"`
	PlayingMode                   shared.MtvPlayingModes                    `json:"playingMode" validate:"required"`
}

type CreateRoomResponse struct {
	State      shared.MtvRoomExposedState `json:"state"`
	WorkflowID string                     `json:"workflowID"`
	RunID      string                     `json:"runID"`
}

func CreateRoomHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	var body CreateRoomRequestBody

	err := json.NewDecoder(r.Body).Decode(&body)
	if err != nil {
		log.Println("create room body decode error", err)
		WriteError(w, err)
		return
	}

	fmt.Printf("received body from server is = %+v\n", body)

	if err := validate.Struct(body); err != nil {
		log.Println("create room validation error", err)
		WriteError(w, err)
		return
	}

	if !body.PlayingMode.IsValid() {
		log.Println("mode is invalid", err)
		WriteError(w, err)
		return
	}

	if body.HasPhysicalAndTimeConstraints && body.PhysicalAndTimeConstraints != nil {
		nowIsBeforeEnd := body.PhysicalAndTimeConstraints.PhysicalConstraintStartsAt.Before(body.PhysicalAndTimeConstraints.PhysicalConstraintEndsAt)
		nowEqualEnd := body.PhysicalAndTimeConstraints.PhysicalConstraintStartsAt.Equal(body.PhysicalAndTimeConstraints.PhysicalConstraintEndsAt)
		timeConstraintAreCorrupted := !nowIsBeforeEnd || nowEqualEnd

		if timeConstraintAreCorrupted {
			log.Println("time constraint are corrupted", err)
			WriteError(w, err)
			return
		}
	}

	options := client.StartWorkflowOptions{
		ID:        body.WorkflowID,
		TaskQueue: shared.ControlTaskQueue,
	}
	initialTracksIDsList := body.InitialTracksIDs

	initialUsers := make(map[string]*shared.InternalStateUser)
	initialUsers[body.UserID] = &shared.InternalStateUser{
		UserID:                            body.UserID,
		DeviceID:                          body.DeviceID,
		TracksVotedFor:                    make([]string, 0),
		UserFitsPositionConstraint:        nil,
		HasControlAndDelegationPermission: true,
		UserHasBeenInvited:                false,
	}

	if body.HasPhysicalAndTimeConstraints && body.PhysicalAndTimeConstraints != nil {
		falseValue := false
		initialUsers[body.UserID].UserFitsPositionConstraint = &falseValue
	}

	params := shared.MtvRoomParameters{
		RoomID:                        body.WorkflowID,
		RoomCreatorUserID:             body.UserID,
		RoomName:                      body.Name,
		MinimumScoreToBePlayed:        body.MinimumScoreToBePlayed,
		InitialUsers:                  initialUsers,
		InitialTracksIDsList:          initialTracksIDsList,
		IsOpen:                        body.IsOpen,
		IsOpenOnlyInvitedUsersCanVote: body.IsOpenOnlyInvitedUsersCanVote,
		HasPhysicalAndTimeConstraints: body.HasPhysicalAndTimeConstraints,
		PhysicalAndTimeConstraints:    nil,
		PlayingMode:                   body.PlayingMode,
	}

	if body.PhysicalAndTimeConstraints != nil {
		params.PhysicalAndTimeConstraints = body.PhysicalAndTimeConstraints
	}

	PhysicalAndTimeConstraintsSetButBooleanFalse := !params.HasPhysicalAndTimeConstraints && params.PhysicalAndTimeConstraints != nil
	if PhysicalAndTimeConstraintsSetButBooleanFalse {
		WriteError(w, errors.New("corrupted payload HasPhysicalAndTimeConstraints true but no constraints informations"))
		return
	}

	onlyInvitedUserTrueButRoomIsNotPublic := params.IsOpenOnlyInvitedUsersCanVote && !params.IsOpen
	if onlyInvitedUserTrueButRoomIsNotPublic {
		WriteError(w, errors.New("corrupted payload IsOpenOnlyInvitedUsersCanVote true but IsOpen false, private room cannot have this setting"))
		return
	}

	we, err := temporal.ExecuteWorkflow(context.Background(), options, workflows.MtvRoomWorkflow, params)
	if err != nil {
		WriteError(w, err)
		return
	}

	res := CreateRoomResponse{
		State:      params.Export(),
		WorkflowID: we.GetID(),
		RunID:      we.GetRunID(),
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(res)
}

type LeaveRoomHandlerBody struct {
	UserID     string `json:"userID" validate:"required,uuid"`
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
}

func LeaveRoomHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body LeaveRoomHandlerBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		fmt.Println("Leave room failed on decode body", err)
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		fmt.Println("Leave room failed on validator body", err)
		WriteError(w, err)
		return
	}

	signal := shared.NewLeaveSignal(shared.NewLeaveSignalArgs{
		UserID: body.UserID,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		signal,
	); err != nil {
		fmt.Println("Couldnt send the signal to temporal", err)
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type JoinRoomHandlerBody struct {
	UserID             string `json:"userID" validate:"required,uuid"`
	DeviceID           string `json:"deviceID" validate:"required,uuid"`
	WorkflowID         string `json:"workflowID" validate:"required,uuid"`
	RunID              string `json:"runID" validate:"required,uuid"`
	UserHasBeenInvited bool   `json:"userHasBeenInvited"`
}

func JoinRoomHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body JoinRoomHandlerBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	signal := shared.NewJoinSignal(shared.NewJoinSignalArgs{
		UserID:             body.UserID,
		DeviceID:           body.DeviceID,
		UserHasBeenInvited: body.UserHasBeenInvited,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		signal,
	); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)

}

type UpdateUserFitsPositionConstraintHandlerBody struct {
	UserID                     string `json:"userID" validate:"required,uuid"`
	WorkflowID                 string `json:"workflowID" validate:"required,uuid"`
	RunID                      string `json:"runID" validate:"required,uuid"`
	UserFitsPositionConstraint bool   `json:"userFitsPositionConstraint"`
}

func UpdateUserFitsPositionConstraintHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body UpdateUserFitsPositionConstraintHandlerBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}

	signal := shared.NewUpdateUserFitsPositionConstraintSignal(shared.NewUpdateUserFitsPositionConstraintSignalArgs{
		UserID:                     body.UserID,
		UserFitsPositionConstraint: body.UserFitsPositionConstraint,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		signal,
	); err != nil {
		fmt.Println(err)

		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)

}

type UpdateDelegationOwnerHandlerBody struct {
	WorkflowID               string `json:"workflowID" validate:"required,uuid"`
	RunID                    string `json:"runID" validate:"required,uuid"`
	NewDelegationOwnerUserID string `json:"newDelegationOwnerUserID" validate:"required,uuid"`
	EmitterUserID            string `json:"emitterUserID" validate:"required,uuid"`
}

func UpdateDelegationOwnerHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body UpdateDelegationOwnerHandlerBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}

	signal := shared.NewUpdateDelegationOwnerSignal(shared.NewUpdateDelegationOwnerSignalArgs{
		NewDelegationOwnerUserID: body.NewDelegationOwnerUserID,
		EmitterUserID:            body.EmitterUserID,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		signal,
	); err != nil {
		fmt.Println(err)

		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)

}

type UpdateControlAndDelegationPermissionHandlerBody struct {
	WorkflowID                        string `json:"workflowID" validate:"required,uuid"`
	RunID                             string `json:"runID" validate:"required,uuid"`
	ToUpdateUserID                    string `json:"toUpdateUserID" validate:"required,uuid"`
	HasControlAndDelegationPermission bool   `json:"hasControlAndDelegationPermission"`
}

func UpdateControlAndDelegationPermissionHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body UpdateControlAndDelegationPermissionHandlerBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		fmt.Println(err)
		WriteError(w, err)
		return
	}

	signal := shared.NewUpdateControlAndDelegationPermissionSignal(shared.NewUpdateControlAndDelegationPermissionSignalArgs{
		ToUpdateUserID:                    body.ToUpdateUserID,
		HasControlAndDelegationPermission: body.HasControlAndDelegationPermission,
	})

	if err := temporal.SignalWorkflow(
		context.Background(),
		body.WorkflowID,
		body.RunID,
		shared.SignalChannelName,
		signal,
	); err != nil {
		fmt.Println(err)

		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	res := make(map[string]interface{})
	res["ok"] = 1
	json.NewEncoder(w).Encode(res)
}

type GetStateBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	UserID     string `json:"userID,omitempty" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
}

func GetStateHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body GetStateBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	response, err := temporal.QueryWorkflow(context.Background(), body.WorkflowID, body.RunID, shared.MtvGetStateQuery, body.UserID)
	if err != nil {
		WriteError(w, err)
		return
	}
	var res shared.MtvRoomExposedState
	if err := response.Get(&res); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

type GetUsersListBody struct {
	WorkflowID string `json:"workflowID" validate:"required,uuid"`
	RunID      string `json:"runID" validate:"required,uuid"`
}

func GetUsersListHandler(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	var body GetUsersListBody

	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		WriteError(w, err)
		return
	}
	if err := validate.Struct(body); err != nil {
		WriteError(w, err)
		return
	}

	response, err := temporal.QueryWorkflow(context.Background(), body.WorkflowID, body.RunID, shared.MtvGetUsersListQuery)
	if err != nil {
		WriteError(w, err)
		return
	}
	var res []shared.ExposedInternalStateUserListElement
	if err := response.Get(&res); err != nil {
		WriteError(w, err)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(res)
}

func PingHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Println("Pong")
}

func WriteError(w http.ResponseWriter, err error) {
	fmt.Println(err)
	w.WriteHeader(http.StatusInternalServerError)
	res := ErrorResponse{Message: err.Error()}
	json.NewEncoder(w).Encode(res)
}

func NotFoundHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusNotFound)
	res := ErrorResponse{Message: "Endpoint not found"}
	json.NewEncoder(w).Encode(res)
}
