package app.booksome.api.media;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

interface MediaAssetRepository extends JpaRepository<MediaAsset, String> {

    Optional<MediaAsset> findByObjectPath(String objectPath);
}
