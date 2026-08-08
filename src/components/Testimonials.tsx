import React from "react";
import testimonialImg1 from "../assets/headshots/portfolio-home.jpeg";
import testimonialImg2 from "../assets/headshots/home3.jpg";
import testimonialImg3 from "../assets/headshots/imgBio.jpg";

const Testimonials: React.FC = () => {
  const testimonials = [
    {
      id: 1,
      name: "Sarah Johnson",
      instrument: "Piano Student",
      image: testimonialImg1.src,
      text: "Amazing instructors who truly care about your progress. I've improved so much in just six months!",
      rating: 5,
    },
    {
      id: 2,
      name: "Michael Chen",
      instrument: "Guitar Student",
      image: testimonialImg2.src,
      text: "The personalized approach to learning has made all the difference. Highly recommend to anyone!",
      rating: 5,
    },
    {
      id: 3,
      name: "Emily Rodriguez",
      instrument: "Vocal Student",
      image: testimonialImg3.src,
      text: "Professional, patient, and inspiring. I finally found the confidence to sing in public!",
      rating: 5,
    },
  ];

  return (
    <section id="testimonials" className="py-20 bg-gray-50">
      <div className="section-container">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-display font-bold text-gray-900 mb-4">
            What Our Students Say
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it - hear from our amazing students!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-5 h-5 text-yellow-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <p className="text-gray-600 mb-6 italic">"{testimonial.text}"</p>

              <div className="flex items-center">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-16 h-16 rounded-full object-cover mr-4"
                />
                <div>
                  <div className="font-semibold text-gray-900">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {testimonial.instrument}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="btn-primary">Read More Reviews</button>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
