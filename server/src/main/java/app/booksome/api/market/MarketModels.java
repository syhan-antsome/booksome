package app.booksome.api.market;

import java.time.Instant;

public final class MarketModels {

    private MarketModels() {
    }

    public record MarketListingResponse(
        String id,
        String sellerId,
        String type,
        String title,
        String author,
        String isbn13,
        String description,
        String conditionLabel,
        Integer price,
        String areaLabel,
        String imageUrl,
        String mediaAssetId,
        String status,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record MarketListingEnvelope(MarketListingResponse listing) {
    }

    public record CreateMarketListingRequest(
        String type,
        String title,
        String author,
        String isbn13,
        String description,
        String conditionLabel,
        Integer price,
        String areaLabel,
        String imageUrl,
        String mediaAssetId
    ) {
    }

    public record UpdateMarketListingRequest(
        String type,
        String title,
        String author,
        String isbn13,
        String description,
        String conditionLabel,
        Integer price,
        String areaLabel,
        String imageUrl,
        String mediaAssetId
    ) {
    }

    public record UpdateMarketListingStatusRequest(String status) {
    }

    public record MarketThreadResponse(
        String id,
        String listingId,
        String buyerId,
        String sellerId,
        Instant createdAt,
        Instant updatedAt
    ) {
    }

    public record MarketThreadEnvelope(MarketThreadResponse thread) {
    }

    public record MarketMessageResponse(
        String id,
        String threadId,
        String senderId,
        String body,
        Instant createdAt
    ) {
    }

    public record MarketThreadSummary(
        MarketThreadResponse thread,
        MarketListingResponse listing,
        MarketMessageResponse latestMessage
    ) {
    }

    public record SendMarketMessageRequest(String body) {
    }
}
