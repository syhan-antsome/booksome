package app.booksome.api.market;

import java.util.List;

import app.booksome.api.market.MarketModels.CreateMarketListingRequest;
import app.booksome.api.market.MarketModels.MarketListingEnvelope;
import app.booksome.api.market.MarketModels.MarketListingResponse;
import app.booksome.api.market.MarketModels.MarketMessageResponse;
import app.booksome.api.market.MarketModels.MarketThreadEnvelope;
import app.booksome.api.market.MarketModels.MarketThreadResponse;
import app.booksome.api.market.MarketModels.MarketThreadSummary;
import app.booksome.api.market.MarketModels.SendMarketMessageRequest;
import app.booksome.api.market.MarketModels.UpdateMarketListingRequest;
import app.booksome.api.market.MarketModels.UpdateMarketListingStatusRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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
@RequestMapping("/api/market")
public class MarketController {

    private final MarketService marketService;

    public MarketController(MarketService marketService) {
        this.marketService = marketService;
    }

    @GetMapping("/listings")
    public List<MarketListingResponse> listListings(@RequestParam(defaultValue = "all") String filter) {
        return marketService.listListings(filter);
    }

    @GetMapping("/listings/{listingId}")
    public MarketListingEnvelope getListing(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String listingId
    ) {
        return marketService.getListing(listingId, subject(jwt));
    }

    @GetMapping("/my-listings")
    public List<MarketListingResponse> listMyListings(@AuthenticationPrincipal Jwt jwt) {
        return marketService.listMyListings(jwt.getSubject());
    }

    @PostMapping("/listings")
    @ResponseStatus(HttpStatus.CREATED)
    public MarketListingResponse createListing(
        @AuthenticationPrincipal Jwt jwt,
        @RequestBody CreateMarketListingRequest request
    ) {
        return marketService.createListing(jwt.getSubject(), request);
    }

    @PutMapping("/listings/{listingId}")
    public MarketListingResponse updateListing(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String listingId,
        @RequestBody UpdateMarketListingRequest request
    ) {
        return marketService.updateListing(jwt.getSubject(), listingId, request);
    }

    @PutMapping("/listings/{listingId}/status")
    public MarketListingResponse updateStatus(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String listingId,
        @RequestBody UpdateMarketListingStatusRequest request
    ) {
        return marketService.updateStatus(jwt.getSubject(), listingId, request.status());
    }

    @PostMapping("/listings/{listingId}/thread")
    public MarketThreadResponse getOrCreateThread(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String listingId
    ) {
        return marketService.getOrCreateThread(jwt.getSubject(), listingId);
    }

    @GetMapping("/threads")
    public List<MarketThreadSummary> listThreadSummaries(@AuthenticationPrincipal Jwt jwt) {
        return marketService.listThreadSummaries(jwt.getSubject());
    }

    @GetMapping("/threads/{threadId}")
    public MarketThreadEnvelope getThread(@AuthenticationPrincipal Jwt jwt, @PathVariable String threadId) {
        return marketService.getThread(threadId, jwt.getSubject());
    }

    @GetMapping("/threads/{threadId}/messages")
    public List<MarketMessageResponse> listMessages(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String threadId
    ) {
        return marketService.listMessages(threadId, jwt.getSubject());
    }

    @PostMapping("/threads/{threadId}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MarketMessageResponse sendMessage(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String threadId,
        @RequestBody SendMarketMessageRequest request
    ) {
        return marketService.sendMessage(threadId, jwt.getSubject(), request.body());
    }

    private String subject(Jwt jwt) {
        return jwt == null ? null : jwt.getSubject();
    }
}
