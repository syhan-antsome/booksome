package app.booksome.api.meetup;

import java.util.List;

import app.booksome.api.meetup.MeetupModels.CreateMeetupRequest;
import app.booksome.api.meetup.MeetupModels.MeetupResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/meetups")
public class MeetupController {

    private final MeetupService meetupService;

    public MeetupController(MeetupService meetupService) {
        this.meetupService = meetupService;
    }

    @GetMapping
    public List<MeetupResponse> listMeetups() {
        return meetupService.listScheduled();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public MeetupResponse createMeetup(
        @AuthenticationPrincipal Jwt jwt,
        @RequestBody CreateMeetupRequest request
    ) {
        return meetupService.create(jwt.getSubject(), request);
    }
}
