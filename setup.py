from setuptools import setup, find_packages

setup(
    name="evidenceai",
    version="0.1.0",
    packages=find_packages(include=['evidenceai', 'evidenceai.*']),
    install_requires=[
        "PyPDF2>=3.0.0",
        "pdfminer.six>=20221105",
        "python-magic>=0.4.27",
    ],
    python_requires=">=3.8",
)
