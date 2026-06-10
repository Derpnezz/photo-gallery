import { useRouter } from 'next/router';
import { getFolderHash, verifyFolderHash } from '../../lib/folderHash';
import GalleryPage from '../gallery/[...slug]'; // Reuse your existing gallery component
import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { hash, folderPath } = context.params as { hash: string; folderPath: string[] };
  const folderName = folderPath[folderPath.length - 1];

  if (!verifyFolderHash(folderName, hash)) {
    return { notFound: true };
  }

  // Pass the folder path to the gallery component
  return {
    props: {
      slug: folderPath,
    },
  };
};

// Reuse your existing gallery page logic
export default function PublicFolderPage({ slug }: { slug: string[] }) {
  const router = useRouter();
  if (router.isFallback) return <div>Loading...</div>;

  // Re-render the GalleryPage with the slug prop
  const GalleryComponent = GalleryPage as any;
  return <GalleryComponent slug={slug} />;
}