import MainLayout from '../layouts/MainLayout';
import DashboardContainer from '../components/DashboardContainer';

const Home: React.FC = () => {
  return (
    <MainLayout title="AssetLink">
      <DashboardContainer />
    </MainLayout>
  );
};

export default Home;