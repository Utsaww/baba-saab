import React from 'react';
import styles from "../weddingPlanner.module.scss";
import wedding from "@/assets/wedding.jpg";
import insta from "@/assets/insta.png";
import Image from "next/image";
import Service from '@/ServiceModule/Components/WeddingService/Service';
import OtherLinksSection from '@/Components/OtherLinksSection/OtherLinksSection';
import InstaGramSection from '@/Components/InstaGramSection/InstaGramSection';

const DestinationWedding = () => {
    
    const topService = [
      {
        id: 1,
        routeName: "Destination wedding",
        routeLink: "/wedding_planner/destination_wedding",
      },
      {
        id: 2,
        routeName: "Hospitality team",
        routeLink: "/wedding_planner/hospitality_team",
      },
      {
        id: 3,
        routeName: "Decoration",
        routeLink: "/wedding_planner/decorations",
      },
      {
        id: 4,
        routeName: "Jaimala theme",
        routeLink: "/wedding_planner/jaimala_theme",
      },
      {
        id: 5,
        routeName: "Event Execution",
        routeLink: "/wedding_planner/event_execution",
      },
      {
        id: 6,
        routeName: "Wedding venues",
        routeLink: "/wedding_planner/wedding_venues",
      },
      {
        id: 7,
        routeName: "Stage Decorations",
        routeLink: "/wedding_planner/stage_decorations",
      },
      {
        id: 6,
        routeName: "Entertainment",
        routeLink: "/wedding_planner/entertainment",
      },
    ];
    const instaData = [
      {
        id: 1,
        name: insta,
        alt: "insta",
      },
      {
        id: 2,
        name: insta,
        alt: "insta",
      },
      {
        id: 3,
        name: insta,
        alt: "insta",
      },
      {
        id: 4,
        name: insta,
        alt: "insta",
      },
      {
        id: 5,
        name: insta,
        alt: "insta",
      },
      {
        id: 6,
        name: insta,
        alt: "insta",
      },
    ];
  return (
    <>
      <section className={styles?.weddingPlanner}>
        <div className={styles?.container}>
          <div className={styles?.weddingPlannerContent}>
            <div className={styles?.leftContent}>
              <div className={styles?.leftImageWrapper}>
                <Image src={wedding} alt="wedding" fill priority />
              </div>
              <h1 className={styles?.weddingPlannerHeading}>
                Say 'I Do' in Paradise: Destination Wedding Dreams Come True
              </h1>
              <p className={styles?.weddingText}>
                Step into the enchanting world of destination weddings amidst
                the breathtaking landscapes of Ramanagar, Jim Corbett,
                Moradabad, Rampur, Amroha, Kashipur, Haldwani, Rudrapur,
                Bareilly, Ghaziabad, Noida, Delhi, Nainital, and Bhimtal.
                Picture-perfect venues await, nestled amidst the serene beauty
                of mountains, forests, and rivers, setting the stage for your
                love story to unfold.
              </p>
              <p className={styles?.weddingText}>
                From the rustic charm of Ramanagar to the wilderness of Jim
                Corbett and the historic allure of Moradabad and Rampur, each
                destination offers its own unique charm and character. Whether
                you dream of a romantic forest ceremony, a majestic riverside
                affair, or a grand celebration in a heritage palace, our
                destination wedding planning services bring your vision to life
                with seamless perfection.
              </p>
              <p className={styles?.weddingText}>
                Amidst the tranquil surroundings of Kashipur, Haldwani,
                Rudrapur, and Bareilly, let the beauty of nature and the warmth
                of hospitality create unforgettable moments for you and your
                loved ones. From intimate gatherings to lavish celebrations, we
                handle every detail with care and expertise, ensuring a
                stress-free experience from start to finish.
              </p>
              <p className={styles?.weddingText}>
                In the bustling cities of Ghaziabad, Noida, and Delhi, immerse
                yourself in the vibrant energy and modern elegance, as we
                orchestrate your dream wedding against the backdrop of iconic
                landmarks and luxurious venues. Whether you prefer a
                contemporary celebration or a traditional ceremony infused with
                cultural richness, we make sure every aspect reflects your
                unique style and personality.
              </p>
              <p className={styles?.weddingText}>
                Escape to the serene lakeside vistas of Nainital and Bhimtal,
                where the serene beauty of the mountains and the shimmering
                waters create a magical setting for your special day. With our
                destination wedding planning services, you can relax and enjoy
                every moment, knowing that your wedding in the lap of nature
                will be nothing short of spectacular.
              </p>
              <p className={styles?.weddingText}>
                Experience the romance, adventure, and beauty of these
                enchanting destinations as you embark on the journey of a
                lifetime with your beloved. Let us turn your dream wedding into
                a reality, creating cherished memories that will last a lifetime.
              </p>
            </div>
            <div className={styles?.rightContent}>
              <OtherLinksSection topService={topService} />
              <InstaGramSection instaData={instaData} />
            </div>
          </div>
        </div>
      </section>
      {/* <Service
        ServiceData={weddingServiceData}
        serviceName="Wedding Service"
        widthClass={styles?.changeWidthWrapper}
        className={styles?.weddingService}
        headingClass={styles?.headingWidth}
      /> */}
    </>
  );
}

export default DestinationWedding
