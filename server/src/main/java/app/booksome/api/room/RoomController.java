package app.booksome.api.room;

import java.util.List;

import app.booksome.api.room.RoomModels.BookroomFeedItem;
import app.booksome.api.room.RoomModels.CreateRoomCommentRequest;
import app.booksome.api.room.RoomModels.CreateRoomPostRequest;
import app.booksome.api.room.RoomModels.CreateRoomRequest;
import app.booksome.api.room.RoomModels.CreateRoomResult;
import app.booksome.api.room.RoomModels.CreatedIdResponse;
import app.booksome.api.room.RoomModels.RoomDetailEnvelope;
import app.booksome.api.room.RoomModels.RoomMembershipResponse;
import app.booksome.api.room.RoomModels.RoomPostResponse;
import app.booksome.api.room.RoomModels.RoomReadingStatusResponse;
import app.booksome.api.room.RoomModels.RoomSummary;
import app.booksome.api.room.RoomModels.SetReadingStatusRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping("/featured")
    public List<RoomSummary> listFeaturedRooms() {
        return roomService.listFeaturedRooms();
    }

    @GetMapping("/feed")
    public List<BookroomFeedItem> listFeed(@RequestParam(defaultValue = "30") int limit) {
        return roomService.listFeed(limit);
    }

    @GetMapping("/by-slug/{slug}")
    public RoomDetailEnvelope getRoom(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug) {
        return roomService.getRoom(slug, subject(jwt));
    }

    @GetMapping("/{roomId}/posts")
    public List<RoomPostResponse> listPosts(@AuthenticationPrincipal Jwt jwt, @PathVariable String roomId) {
        return roomService.listPosts(roomId, subject(jwt));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreateRoomResult createRoom(@AuthenticationPrincipal Jwt jwt, @RequestBody CreateRoomRequest request) {
        return roomService.createRoom(jwt.getSubject(), request);
    }

    @PostMapping("/{roomId}/join")
    public RoomMembershipResponse joinRoom(@AuthenticationPrincipal Jwt jwt, @PathVariable String roomId) {
        return roomService.joinRoom(jwt.getSubject(), roomId);
    }

    @PutMapping("/{roomId}/reading-status")
    public RoomReadingStatusResponse setReadingStatus(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String roomId,
        @RequestBody SetReadingStatusRequest request
    ) {
        return roomService.setReadingStatus(jwt.getSubject(), roomId, request.status());
    }

    @PostMapping("/{roomId}/posts")
    @ResponseStatus(HttpStatus.CREATED)
    public CreatedIdResponse createPost(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String roomId,
        @RequestBody CreateRoomPostRequest request
    ) {
        return roomService.createPost(jwt.getSubject(), roomId, request);
    }

    @PostMapping("/posts/{postId}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public CreatedIdResponse createComment(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String postId,
        @RequestBody CreateRoomCommentRequest request
    ) {
        return roomService.createComment(jwt.getSubject(), postId, request);
    }

    @PutMapping("/posts/{postId}/reaction")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void addReaction(@AuthenticationPrincipal Jwt jwt, @PathVariable String postId) {
        roomService.setReaction(jwt.getSubject(), postId, true);
    }

    @DeleteMapping("/posts/{postId}/reaction")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeReaction(@AuthenticationPrincipal Jwt jwt, @PathVariable String postId) {
        roomService.setReaction(jwt.getSubject(), postId, false);
    }

    private String subject(Jwt jwt) {
        return jwt == null ? null : jwt.getSubject();
    }
}
