package app.booksome.api.admin;

import app.booksome.api.admin.AdminModels.AdminListing;
import app.booksome.api.admin.AdminModels.AdminPost;
import app.booksome.api.admin.AdminModels.AdminReport;
import app.booksome.api.admin.AdminModels.AdminRoom;
import app.booksome.api.admin.AdminModels.AdminUser;
import app.booksome.api.admin.AdminModels.DashboardResponse;
import app.booksome.api.admin.AdminModels.PageResponse;
import app.booksome.api.admin.AdminModels.SystemOverview;
import app.booksome.api.admin.AdminModels.UpdateListingRequest;
import app.booksome.api.admin.AdminModels.UpdatePostRequest;
import app.booksome.api.admin.AdminModels.UpdateReportRequest;
import app.booksome.api.admin.AdminModels.UpdateRoomRequest;
import app.booksome.api.admin.AdminModels.UpdateUserRequest;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/dashboard")
    public DashboardResponse dashboard() {
        return adminService.dashboard();
    }

    @GetMapping("/users")
    public PageResponse<AdminUser> users(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int perPage,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "DESC") String order,
        @RequestParam(defaultValue = "") String q,
        @RequestParam(defaultValue = "") String status,
        @RequestParam(defaultValue = "") String role
    ) {
        return adminService.listUsers(page, perPage, sort, order, q, status, role);
    }

    @PatchMapping("/users/{userId}")
    public AdminUser updateUser(
        @AuthenticationPrincipal Jwt jwt,
        @PathVariable String userId,
        @RequestBody UpdateUserRequest request
    ) {
        return adminService.updateUserStatus(jwt.getSubject(), userId, request.status());
    }

    @GetMapping("/books")
    public PageResponse<AdminModels.AdminBook> books(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int perPage,
        @RequestParam(defaultValue = "updatedAt") String sort,
        @RequestParam(defaultValue = "DESC") String order,
        @RequestParam(defaultValue = "") String q,
        @RequestParam(defaultValue = "") String status
    ) {
        return adminService.listBooks(page, perPage, sort, order, q, status);
    }

    @GetMapping("/rooms")
    public PageResponse<AdminRoom> rooms(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int perPage,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "DESC") String order,
        @RequestParam(defaultValue = "") String q,
        @RequestParam(defaultValue = "") String visibility
    ) {
        return adminService.listRooms(page, perPage, sort, order, q, visibility);
    }

    @PatchMapping("/rooms/{roomId}")
    public AdminRoom updateRoom(@PathVariable String roomId, @RequestBody UpdateRoomRequest request) {
        return adminService.updateRoom(roomId, request.visibility());
    }

    @GetMapping("/posts")
    public PageResponse<AdminPost> posts(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int perPage,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "DESC") String order,
        @RequestParam(defaultValue = "") String q,
        @RequestParam(defaultValue = "") String moderationStatus,
        @RequestParam(defaultValue = "") String visibility
    ) {
        return adminService.listPosts(page, perPage, sort, order, q, moderationStatus, visibility);
    }

    @PatchMapping("/posts/{postId}")
    public AdminPost updatePost(@PathVariable String postId, @RequestBody UpdatePostRequest request) {
        return adminService.updatePost(postId, request.moderationStatus(), request.visibility());
    }

    @GetMapping("/reports")
    public PageResponse<AdminReport> reports(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int perPage,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "DESC") String order,
        @RequestParam(defaultValue = "") String q,
        @RequestParam(defaultValue = "") String state
    ) {
        return adminService.listReports(page, perPage, sort, order, q, state);
    }

    @PatchMapping("/reports/{reportId}")
    public AdminReport updateReport(@PathVariable String reportId, @RequestBody UpdateReportRequest request) {
        return adminService.updateReport(reportId, request.resolved());
    }

    @GetMapping("/listings")
    public PageResponse<AdminListing> listings(
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "25") int perPage,
        @RequestParam(defaultValue = "createdAt") String sort,
        @RequestParam(defaultValue = "DESC") String order,
        @RequestParam(defaultValue = "") String q,
        @RequestParam(defaultValue = "") String status
    ) {
        return adminService.listListings(page, perPage, sort, order, q, status);
    }

    @PatchMapping("/listings/{listingId}")
    public AdminListing updateListing(@PathVariable String listingId, @RequestBody UpdateListingRequest request) {
        return adminService.updateListing(listingId, request.status());
    }

    @GetMapping("/system")
    public SystemOverview system() {
        return adminService.systemOverview();
    }
}
